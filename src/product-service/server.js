const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
const prometheus = require('prom-client');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4003;

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
  clientId: 'product-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer = kafka.producer();
producer.connect().catch(console.error);

prometheus.collectDefaultMetrics({ prefix: 'product_' });

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({ method: req.method, path: req.path, status: res.statusCode, duration: Date.now() - start }));
  });
  next();
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = 'SELECT p.*, c.name as category_name FROM products.products p LEFT JOIN products.categories c ON p.category_id = c.id WHERE p.is_active = true';
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND c.slug = $${paramIndex++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(query.replace('SELECT p.*, c.name as category_name', 'SELECT COUNT(*)'), params);
    const total = parseInt(countResult.rows[0].count);

    const allowedSorts = ['created_at', 'name', 'base_price', 'average_rating'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY p.${sortCol} ${sortOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products.categories WHERE is_active = true ORDER BY sort_order, name');
    res.json(result.rows);
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/health', (req, res) => {
  res.json({ status: 'UP', service: 'product-service', timestamp: new Date().toISOString() });
});

app.get('/api/products/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

app.get('/api/products/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const cached = await redis.get(`product:${slug}`);
    if (cached) return res.json(JSON.parse(cached));

    const result = await pool.query(
      'SELECT p.*, c.name as category_name FROM products.products p LEFT JOIN products.categories c ON p.category_id = c.id WHERE p.slug = $1 AND p.is_active = true',
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await redis.set(`product:${slug}`, JSON.stringify(result.rows[0]), 'EX', 600);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, slug, description, shortDescription, categoryId, basePrice, salePrice, currency, imageUrls, attributes, isFeatured } = req.body;
    if (!name || !slug || !basePrice) {
      return res.status(400).json({ error: 'Name, slug, and base_price required' });
    }
    const result = await pool.query(
      `INSERT INTO products.products (name, slug, description, short_description, category_id, base_price, sale_price, currency, image_urls, attributes, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, slug, description, shortDescription, categoryId, basePrice, salePrice, currency || 'USD', imageUrls || [], attributes || {}, isFeatured || false]
    );
    await producer.send({
      topic: 'product-events',
      messages: [{ key: 'product.created', value: JSON.stringify(result.rows[0]) }]
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Product create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/:productId/reviews', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products.reviews WHERE product_id = $1 ORDER BY created_at DESC',
      [req.params.productId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Product service listening on port ${PORT}`);
});
