const Redis = require('ioredis');

let redis;

function getCache() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
  }
  return redis;
}

async function cacheGet(key) {
  const r = getCache();
  const data = await r.get(key);
  return data ? JSON.parse(data) : null;
}

async function cacheSet(key, value, ttl = 300) {
  const r = getCache();
  await r.set(key, JSON.stringify(value), 'EX', ttl);
}

async function cacheDel(key) {
  const r = getCache();
  await r.del(key);
}

async function cacheDelPattern(pattern) {
  const r = getCache();
  const keys = await r.keys(pattern);
  if (keys.length > 0) {
    await r.del(keys);
  }
}

module.exports = { getCache, cacheGet, cacheSet, cacheDel, cacheDelPattern };
