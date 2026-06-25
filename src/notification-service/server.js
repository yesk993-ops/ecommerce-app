const express = require('express');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');
const nodemailer = require('nodemailer');
const prometheus = require('prom-client');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4008;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'ecommerce',
  password: process.env.DB_PASSWORD || 'ecommerce_pass',
  database: process.env.DB_NAME || 'ecommerce'
});

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailhog',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: false,
  ignoreTLS: true
});

prometheus.collectDefaultMetrics({ prefix: 'notification_' });

const emailsSent = new prometheus.Counter({
  name: 'notification_emails_sent_total',
  help: 'Total emails sent',
  labelNames: ['type', 'status']
});

const notificationsCreated = new prometheus.Counter({
  name: 'notification_created_total',
  help: 'Total notifications created',
  labelNames: ['type']
});

async function createNotification(userId, type, title, body, data = {}) {
  await pool.query(
    'INSERT INTO notifications.notifications (user_id, type, title, body, data) VALUES ($1, $2, $3, $4, $5)',
    [userId, type, title, body, JSON.stringify(data)]
  );
  notificationsCreated.inc({ type });
}

async function sendEmail(to, subject, body) {
  try {
    await transporter.sendMail({
      from: 'noreply@ecommerce.local',
      to,
      subject,
      html: body
    });
    await pool.query(
      "INSERT INTO notifications.email_log (to_email, subject, body, status, sent_at) VALUES ($1, $2, $3, 'sent', CURRENT_TIMESTAMP)",
      [to, subject, body]
    );
    emailsSent.inc({ type: subject.split(' ')[0].toLowerCase(), status: 'sent' });
  } catch (err) {
    await pool.query(
      "INSERT INTO notifications.email_log (to_email, subject, body, status, error) VALUES ($1, $2, $3, 'failed', $4)",
      [to, subject, body, err.message]
    );
    emailsSent.inc({ type: 'email', status: 'failed' });
    console.error('Email send failed:', err.message);
  }
}

async function startConsumer() {
  const consumer = kafka.consumer({ groupId: 'notification-group' });
  await consumer.connect();

  const topics = ['user-events', 'order-events', 'payment-events', 'product-events', 'cart-events'];
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        const eventType = message.key ? message.key.toString() : topic;

        switch (eventType) {
          case 'user.registered':
            await createNotification(event.userId, 'welcome', 'Welcome to E-Commerce!', 'Thank you for registering.');
            await sendEmail(event.email, 'Welcome to E-Commerce', '<h1>Welcome!</h1><p>Thank you for joining.</p>');
            break;

          case 'order.created':
            await createNotification(event.userId, 'order_confirmation', `Order #${event.orderNumber} Confirmed`, `Your order of $${event.total} has been placed.`);
            break;

          case 'order.confirmed':
            await createNotification(event.userId, 'order_update', 'Order Confirmed', 'Your order has been confirmed and is being processed.');
            break;

          case 'order.cancelled':
            await createNotification(event.userId, 'order_cancelled', 'Order Cancelled', 'Your order has been cancelled.');
            break;

          case 'order.shipped':
            await createNotification(event.userId, 'order_shipped', 'Order Shipped!', 'Your order is on its way!');
            break;

          case 'payment.completed':
            await createNotification(event.userId, 'payment', 'Payment Successful', `Payment of $${event.amount} processed successfully.`);
            break;

          case 'payment.failed':
            await createNotification(event.userId, 'payment_failed', 'Payment Failed', `Payment of $${event.amount} failed. Please try again.`);
            break;

          case 'payment.refunded':
            await createNotification(event.userId, 'refund', 'Refund Processed', 'Your refund has been processed.');
            break;

          default:
            console.log(`Unhandled event type: ${eventType}`);
        }
        console.log(`Processed ${eventType} for user ${event.userId}`);
      } catch (err) {
        console.error('Notification processing error:', err);
      }
    }
  });
}

startConsumer().catch(console.error);

app.get('/api/notifications', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'x-user-id header required' });
    const result = await pool.query(
      'SELECT * FROM notifications.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications.notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications.notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/notifications/health', (req, res) => {
  res.json({ status: 'UP', service: 'notification-service', timestamp: new Date().toISOString() });
});

app.get('/api/notifications/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

app.listen(PORT, () => {
  console.log(`Notification service listening on port ${PORT}`);
});
