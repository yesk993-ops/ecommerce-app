const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function rateLimiter(windowMs = 60000, max = 100) {
  const requests = new Map();
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    const timestamps = requests.get(ip).filter(t => now - t < windowMs);
    if (timestamps.length >= max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    timestamps.push(now);
    requests.set(ip, timestamps);
    next();
  };
}

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }));
  });
  next();
}

module.exports = { authenticate, authorize, rateLimiter, requestLogger };
