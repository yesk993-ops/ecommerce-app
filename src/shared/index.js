const { createLogger, format, transports } = require('winston');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function getLogger(service) {
  return createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
    defaultMeta: { service },
    transports: [
      new transports.Console({
        format: format.combine(format.colorize(), format.simple())
      })
    ]
  });
}

function createToken(payload, secret, expiresIn = '15m') {
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function buildResponse(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function errorHandler(err, req, res, next) {
  const logger = getLogger(req.service || 'unknown');
  logger.error({ message: err.message, stack: err.stack, path: req.path });
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.statusCode || 500
  });
}

module.exports = { getLogger, createToken, verifyToken, hashPassword, comparePassword, buildResponse, errorHandler };
