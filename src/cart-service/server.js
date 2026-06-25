const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
const jwt = require('jsonwebtoken');
const prometheus = require('prom-client');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4004;

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
  clientId: 'cart-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer = kafka.producer();
producer.connect().catch(console.error);

prometheus.collectDefaultMetrics({ prefix: 'cart_' });

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'dev-jwt-secret');
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function getOrCreateCart(userId) {
  let result = await pool.query(
    "SELECT * FROM carts.carts WHERE user_id = $1 AND status = 'active'",
    [userId]
  );
  if (result.rows.length === 0) {
    result = await pool.query(
      'INSERT INTO carts.carts (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
  }
  return result.rows[0];
}

app.get('/api/cart', authenticate, async (req, res) => {
  try {
    const cached = await redis.get(`cart:${req.user.id}`);
    if (cached) return res.json(JSON.parse(cached));

    const cart = await getOrCreateCart(req.user.id);
    const items = await pool.query(
      'SELECT ci.*, p.image_urls FROM carts.cart_items ci LEFT JOIN products.products p ON ci.product_id::text = p.id::text WHERE ci.cart_id = $1',
      [cart.id]
    );
    const total = items.rows.reduce((sum, item) => sum + parseFloat(item.unit_price) * item.quantity, 0);
    const result = { cart, items: items.rows, total: parseFloat(total.toFixed(2)) };
    await redis.set(`cart:${req.user.id}`, JSON.stringify(result), 'EX', 120);
    res.json(result);
  } catch (err) {
    console.error('Cart get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/cart/items', authenticate, async (req, res) => {
  try {
    const { productId, productName, unitPrice, quantity = 1, imageUrl } = req.body;
    if (!productId || !unitPrice) {
      return res.status(400).json({ error: 'productId and unitPrice required' });
    }
    const cart = await getOrCreateCart(req.user.id);
    const existing = await pool.query(
      'SELECT * FROM carts.cart_items WHERE cart_id = $1 AND product_id = $2',
      [cart.id, productId]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE carts.cart_items SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, existing.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO carts.cart_items (cart_id, product_id, product_name, unit_price, quantity, image_url) VALUES ($1, $2, $3, $4, $5, $6)',
        [cart.id, productId, productName, unitPrice, quantity, imageUrl]
      );
    }
    await redis.del(`cart:${req.user.id}`);
    await producer.send({
      topic: 'cart-events',
      messages: [{ key: 'cart.item.added', value: JSON.stringify({ userId: req.user.id, productId, quantity }) }]
    });
    res.status(201).json({ message: 'Item added to cart' });
  } catch (err) {
    console.error('Cart add error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/cart/items/:itemId', authenticate, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }
    await pool.query('UPDATE carts.cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [quantity, req.params.itemId]);
    await redis.del(`cart:${req.user.id}`);
    res.json({ message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/cart/items/:itemId', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM carts.cart_items WHERE id = $1', [req.params.itemId]);
    await redis.del(`cart:${req.user.id}`);
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/cart', authenticate, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await pool.query('DELETE FROM carts.cart_items WHERE cart_id = $1', [cart.id]);
    await redis.del(`cart:${req.user.id}`);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/cart/health', (req, res) => {
  res.json({ status: 'UP', service: 'cart-service', timestamp: new Date().toISOString() });
});

app.get('/api/cart/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

app.listen(PORT, () => {
  console.log(`Cart service listening on port ${PORT}`);
});
