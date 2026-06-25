const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
const jwt = require('jsonwebtoken');
const prometheus = require('prom-client');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4005;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'ecommerce',
  password: process.env.DB_PASSWORD || 'ecommerce_pass',
  database: process.env.DB_NAME || 'ecommerce'
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined
});

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer = kafka.producer();
producer.connect().catch(console.error);

prometheus.collectDefaultMetrics({ prefix: 'order_' });

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'dev-jwt-secret');
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function generateOrderNumber() {
  const prefix = 'ORD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

app.post('/api/orders', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { shippingAddressId, billingAddressId, notes } = req.body;
    await client.query('BEGIN');

    const cartResult = await client.query(
      "SELECT * FROM carts.carts WHERE user_id = $1 AND status = 'active'",
      [req.user.id]
    );
    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No active cart found' });
    }
    const cart = cartResult.rows[0];

    const itemsResult = await client.query(
      'SELECT * FROM carts.cart_items WHERE cart_id = $1',
      [cart.id]
    );
    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const subtotal = itemsResult.rows.reduce((s, i) => s + parseFloat(i.unit_price) * i.quantity, 0);
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const shippingCost = subtotal > 100 ? 0 : 9.99;
    const total = parseFloat((subtotal + tax + shippingCost).toFixed(2));
    const orderNumber = generateOrderNumber();

    const orderResult = await client.query(
      `INSERT INTO orders.orders (order_number, user_id, subtotal, tax, shipping_cost, total, shipping_address_id, billing_address_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [orderNumber, req.user.id, subtotal, tax, shippingCost, total, shippingAddressId, billingAddressId, notes]
    );
    const order = orderResult.rows[0];

    for (const item of itemsResult.rows) {
      await client.query(
        'INSERT INTO orders.order_items (order_id, product_id, product_name, unit_price, quantity, total_price) VALUES ($1, $2, $3, $4, $5, $6)',
        [order.id, item.product_id, item.product_name, item.unit_price, item.quantity, parseFloat((parseFloat(item.unit_price) * item.quantity).toFixed(2))]
      );
    }

    await client.query("UPDATE carts.carts SET status = 'checked_out', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [cart.id]);
    await client.query('COMMIT');

    await redis.del(`cart:${req.user.id}`);
    await producer.send({
      topic: 'order-events',
      messages: [{ key: 'order.created', value: JSON.stringify({ orderId: order.id, orderNumber, userId: req.user.id, total }) }]
    });

    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/orders', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = 'SELECT * FROM orders.orders WHERE user_id = $1';
    const params = [req.user.id];
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);
    res.json({ data: result.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Orders list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/orders/health', (req, res) => {
  res.json({ status: 'UP', service: 'order-service', timestamp: new Date().toISOString() });
});

app.get('/api/orders/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

app.get('/api/orders/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders.orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const items = await pool.query('SELECT * FROM orders.order_items WHERE order_id = $1', [req.params.id]);
    const history = await pool.query('SELECT * FROM orders.order_history WHERE order_id = $1 ORDER BY created_at', [req.params.id]);
    res.json({ ...result.rows[0], items: items.rows, history: history.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/orders/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['confirmed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const order = await pool.query('SELECT * FROM orders.orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    await pool.query(
      'INSERT INTO orders.order_history (order_id, from_status, to_status, changed_by) VALUES ($1, $2, $3, $4)',
      [req.params.id, order.rows[0].status, status, req.user.id]
    );
    const result = await pool.query('UPDATE orders.orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, req.params.id]);

    await producer.send({
      topic: 'order-events',
      messages: [{ key: `order.${status}`, value: JSON.stringify({ orderId: req.params.id, userId: req.user.id, status }) }]
    });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
});
