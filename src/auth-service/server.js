const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Kafka } = require('kafkajs');
const prometheus = require('prom-client');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

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
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const producer = kafka.producer();
producer.connect().catch(console.error);

prometheus.collectDefaultMetrics({ prefix: 'auth_' });

const httpDuration = new prometheus.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
  });
  next();
});

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const existing = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO auth.users (email, password_hash, role) VALUES ($1, $2, 'customer') RETURNING id, email, role, created_at`,
      [email, passwordHash]
    );
    const user = result.rows[0];
    const tokens = generateTokens(user);
    await redis.set(`session:${user.id}`, JSON.stringify(tokens), 'EX', 86400);
    await producer.send({
      topic: 'user-events',
      messages: [{ key: 'user.registered', value: JSON.stringify({ userId: user.id, email, firstName, lastName }) }]
    });
    res.status(201).json({ user, ...tokens });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await pool.query(
      'SELECT id, email, password_hash, role, is_active FROM auth.users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await pool.query('UPDATE auth.users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    const tokens = generateTokens(user);
    await redis.set(`session:${user.id}`, JSON.stringify(tokens), 'EX', 86400);
    res.json({ user: { id: user.id, email: user.email, role: user.role }, ...tokens });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const result = await pool.query('SELECT id, email, role FROM auth.users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    const tokens = generateTokens(result.rows[0]);
    res.json(tokens);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      await redis.del(`session:${decoded.id}`);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.json({ message: 'Logged out' });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ valid: false });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

app.get('/api/auth/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

app.get('/api/auth/health', (req, res) => {
  res.json({ status: 'UP', service: 'auth-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Auth service listening on port ${PORT}`);
});
