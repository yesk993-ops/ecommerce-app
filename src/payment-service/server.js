const express = require('express');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');
const jwt = require('jsonwebtoken');
const prometheus = require('prom-client');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4006;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'ecommerce',
  password: process.env.DB_PASSWORD || 'ecommerce_pass',
  database: process.env.DB_NAME || 'ecommerce'
});

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer = kafka.producer();
producer.connect().catch(console.error);

prometheus.collectDefaultMetrics({ prefix: 'payment_' });

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

app.post('/api/payments/process', authenticate, async (req, res) => {
  try {
    const { orderId, amount, currency = 'USD', paymentMethod = 'card', cardToken } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId and amount required' });
    }

    const transactionId = `txn_${crypto.randomBytes(16).toString('hex')}`;

    const paymentResult = await pool.query(
      `INSERT INTO payments.transactions (order_id, user_id, amount, currency, status, payment_method, transaction_id)
       VALUES ($1, $2, $3, $4, 'processing', $5, $6) RETURNING *`,
      [orderId, req.user.id, amount, currency, paymentMethod, transactionId]
    );

    const paymentSuccessful = Math.random() > 0.1;
    const finalStatus = paymentSuccessful ? 'completed' : 'failed';

    await pool.query(
      "UPDATE payments.transactions SET status = $1, gateway_response = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
      [finalStatus, JSON.stringify({ success: paymentSuccessful, transactionId, processedAt: new Date().toISOString() }), paymentResult.rows[0].id]
    );

    await producer.send({
      topic: 'payment-events',
      messages: [{
        key: `payment.${finalStatus}`,
        value: JSON.stringify({ transactionId, orderId, userId: req.user.id, amount, status: finalStatus })
      }]
    });

    await producer.send({
      topic: 'order-events',
      messages: [{
        key: `payment.${finalStatus}`,
        value: JSON.stringify({ orderId, paymentId: paymentResult.rows[0].id, status: finalStatus })
      }]
    });

    res.json({
      transactionId,
      status: finalStatus,
      amount,
      currency,
      message: paymentSuccessful ? 'Payment processed successfully' : 'Payment failed'
    });
  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

app.get('/api/payments/health', (req, res) => {
  res.json({ status: 'UP', service: 'payment-service', timestamp: new Date().toISOString() });
});

app.get('/api/payments/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

app.get('/api/payments/:orderId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payments.transactions WHERE order_id = $1 AND user_id = $2 ORDER BY created_at DESC',
      [req.params.orderId, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/payments/refund', authenticate, async (req, res) => {
  try {
    const { transactionId } = req.body;
    const result = await pool.query(
      "UPDATE payments.transactions SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $1 RETURNING *",
      [transactionId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });

    await producer.send({
      topic: 'payment-events',
      messages: [{ key: 'payment.refunded', value: JSON.stringify({ transactionId, status: 'refunded' }) }]
    });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Payment service listening on port ${PORT}`);
});
