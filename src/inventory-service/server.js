const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
const prometheus = require('prom-client');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4007;

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
  clientId: 'inventory-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const consumer = kafka.consumer({ groupId: 'inventory-group' });
const producer = kafka.producer();
producer.connect().catch(console.error);

prometheus.collectDefaultMetrics({ prefix: 'inventory_' });

const stockLevelGauge = new prometheus.Gauge({
  name: 'inventory_stock_level',
  help: 'Current stock level by product',
  labelNames: ['product_id']
});

app.get('/api/inventory/:productId', async (req, res) => {
  try {
    const cached = await redis.get(`stock:${req.params.productId}`);
    if (cached) return res.json(JSON.parse(cached));

    const result = await pool.query('SELECT * FROM inventory.stock WHERE product_id = $1', [req.params.productId]);
    if (result.rows.length === 0) {
      return res.json({ productId: req.params.productId, quantity: 0, reservedQuantity: 0 });
    }
    await redis.set(`stock:${req.params.productId}`, JSON.stringify(result.rows[0]), 'EX', 60);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { productId, quantity, lowStockThreshold = 10, location } = req.body;
    if (!productId || quantity === undefined) {
      return res.status(400).json({ error: 'productId and quantity required' });
    }
    const result = await pool.query(
      `INSERT INTO inventory.stock (product_id, quantity, low_stock_threshold, location)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id) DO UPDATE SET quantity = inventory.stock.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [productId, quantity, lowStockThreshold, location]
    );
    stockLevelGauge.set({ product_id: productId }, quantity);
    await redis.del(`stock:${productId}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory/reserve', async (req, res) => {
  const client = await pool.connect();
  try {
    const { productId, quantity, orderId } = req.body;
    await client.query('BEGIN');

    const stock = await client.query('SELECT * FROM inventory.stock WHERE product_id = $1 FOR UPDATE', [productId]);
    if (stock.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found in inventory' });
    }

    const available = stock.rows[0].quantity - stock.rows[0].reserved_quantity;
    if (available < quantity) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Insufficient stock', available });
    }

    await client.query(
      'UPDATE inventory.stock SET reserved_quantity = reserved_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
      [quantity, productId]
    );
    await client.query(
      "INSERT INTO inventory.stock_movements (product_id, movement_type, quantity_change, reference_type, reference_id, notes) VALUES ($1, 'reserve', $2, 'order', $3, $4)",
      [productId, -quantity, orderId, `Reserved for order ${orderId}`]
    );
    await client.query('COMMIT');

    stockLevelGauge.set({ product_id: productId }, stock.rows[0].quantity - quantity);
    await redis.del(`stock:${productId}`);
    res.json({ message: 'Stock reserved', productId, quantity });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reserve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.post('/api/inventory/release', async (req, res) => {
  try {
    const { productId, quantity, orderId } = req.body;
    await pool.query(
      'UPDATE inventory.stock SET reserved_quantity = GREATEST(reserved_quantity - $1, 0), updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
      [quantity, productId]
    );
    await pool.query(
      "INSERT INTO inventory.stock_movements (product_id, movement_type, quantity_change, reference_type, reference_id, notes) VALUES ($1, 'release', $2, 'order', $3, $4)",
      [productId, quantity, orderId, `Released from order ${orderId}`]
    );
    await redis.del(`stock:${productId}`);
    res.json({ message: 'Stock released' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/inventory/low-stock', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM inventory.stock WHERE quantity <= low_stock_threshold ORDER BY quantity ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/inventory/health', (req, res) => {
  res.json({ status: 'UP', service: 'inventory-service', timestamp: new Date().toISOString() });
});

app.get('/api/inventory/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'order-events', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        if (event.status === 'cancelled') {
          const orderItems = await pool.query('SELECT product_id, quantity FROM orders.order_items WHERE order_id = $1', [event.orderId]);
          for (const item of orderItems.rows) {
            await pool.query(
              'UPDATE inventory.stock SET reserved_quantity = GREATEST(reserved_quantity - $1, 0), quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
              [item.quantity, item.product_id]
            );
            await pool.query(
              "INSERT INTO inventory.stock_movements (product_id, movement_type, quantity_change, reference_type, reference_id, notes) VALUES ($1, 'restock', $2, 'cancellation', $3, 'Order cancelled - restocked')",
              [item.product_id, item.quantity, event.orderId]
            );
          }
          console.log(`Inventory restored for cancelled order ${event.orderId}`);
        }
      } catch (err) {
        console.error('Consumer error:', err);
      }
    }
  });
}
startConsumer().catch(console.error);

app.listen(PORT, () => {
  console.log(`Inventory service listening on port ${PORT}`);
});
