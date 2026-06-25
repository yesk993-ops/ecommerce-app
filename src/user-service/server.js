const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
const prometheus = require('prom-client');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4002;

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
  clientId: 'user-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer = kafka.producer();
producer.connect().catch(console.error);

prometheus.collectDefaultMetrics({ prefix: 'user_' });

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({ method: req.method, path: req.path, status: res.statusCode, duration }));
  });
  next();
});

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/users/profile', authenticate, async (req, res) => {
  try {
    const cached = await redis.get(`profile:${req.user.id}`);
    if (cached) return res.json(JSON.parse(cached));

    let result = await pool.query(
      'SELECT id, user_id, first_name, last_name, phone, avatar_url, date_of_birth FROM users.profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO users.profiles (user_id) VALUES ($1) RETURNING id, user_id',
        [req.user.id]
      );
    }
    await redis.set(`profile:${req.user.id}`, JSON.stringify(result.rows[0]), 'EX', 300);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, avatarUrl, dateOfBirth } = req.body;
    const result = await pool.query(
      `INSERT INTO users.profiles (user_id, first_name, last_name, phone, avatar_url, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         first_name = COALESCE($2, users.profiles.first_name),
         last_name = COALESCE($3, users.profiles.last_name),
         phone = COALESCE($4, users.profiles.phone),
         avatar_url = COALESCE($5, users.profiles.avatar_url),
         date_of_birth = COALESCE($6, users.profiles.date_of_birth),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, firstName, lastName, phone, avatarUrl, dateOfBirth]
    );
    await redis.del(`profile:${req.user.id}`);
    await producer.send({
      topic: 'user-events',
      messages: [{ key: 'user.profile.updated', value: JSON.stringify({ userId: req.user.id }) }]
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/addresses', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users.addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Addresses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/addresses', authenticate, async (req, res) => {
  try {
    const { label, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;
    if (isDefault) {
      await pool.query('UPDATE users.addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }
    const result = await pool.query(
      `INSERT INTO users.addresses (user_id, label, address_line1, address_line2, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, label || 'home', addressLine1, addressLine2, city, state, postalCode, country || 'US', isDefault || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Address create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/health', (req, res) => {
  res.json({ status: 'UP', service: 'user-service', timestamp: new Date().toISOString() });
});

app.get('/api/users/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

app.listen(PORT, () => {
  console.log(`User service listening on port ${PORT}`);
});
