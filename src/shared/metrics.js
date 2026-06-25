const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const activeConnections = new prometheus.Gauge({
  name: 'http_active_connections',
  help: 'Number of active connections'
});

function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  activeConnections.inc();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    end({ method: req.method, route, status: res.statusCode });
    httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
    activeConnections.dec();
  });
  next();
}

async function metricsEndpoint(req, res) {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
}

function initMetrics() {
  prometheus.collectDefaultMetrics();
  return { metricsMiddleware, metricsEndpoint };
}

module.exports = { initMetrics, httpRequestDuration, httpRequestsTotal, activeConnections };
