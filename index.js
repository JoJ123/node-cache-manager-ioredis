const Redis = require('ioredis');

const redisStore = (ioRedisInstance) => {
  let redisCache = ioRedisInstance;

  const storeArgs = redisCache.options;

  let self = {
    name: 'redis',
    isCacheableValue: storeArgs.isCacheableValue || (value => value !== undefined && value !== null),
  };

  self.getClient = () => redisCache;

  self.set = (key, value, options, cb) => (
    new Promise((resolve, reject) => {
      if (typeof options === 'function') {
        cb = options;
        options = {};
      }
      options = options || {};

      if (!cb) {
        cb = (err, result) => (err ? reject(err) : resolve(result));
      }

      if (!self.isCacheableValue(value)) {
        return cb(new Error(`"${value}" is not a cacheable value`));
      }

      const ttl = (options.ttl || options.ttl === 0) ? options.ttl : storeArgs.ttl;
      const val = JSON.stringify(value) || '"undefined"';

      if (ttl) {
        redisCache.setex(key, ttl, val, handleResponse(cb));
      } else {
        redisCache.set(key, val, handleResponse(cb));
      }
    })
  );

  self.get = (key, options, cb) => (
    new Promise((resolve, reject) => {
      if (typeof options === 'function') {
        cb = options;
      }

      if (!cb) {
        cb = (err, result) => (err ? reject(err) : resolve(result));
      }

      redisCache.get(key, handleResponse(cb, { parse: true }));
    })
  );
  
  self.del = (key, options, cb) => {
    if (typeof options === 'function') {
      cb = options;
    }

    redisCache.del(key, handleResponse(cb));
  };

  self.reset = cb => redisCache.flushdb(handleResponse(cb));
    
  self.keys = (pattern, cb) => (
    new Promise((resolve, reject) => {
      if (typeof pattern === 'function') {
        cb = pattern;
        pattern = '*';
      }

      if (!cb) {
        cb = (err, result) => (err ? reject(err) : resolve(result));
      }

      redisCache.keys(pattern, handleResponse(cb));
    })
  );

  self.ttl = (key, cb) => redisCache.ttl(key, handleResponse(cb));

  return self;
};
  
function handleResponse(cb, opts = {}) {
  return (err, result) => {
    if (err) {
      return cb && cb(err);
    }

    if (opts.parse) {
      try {
        result = JSON.parse(result);
      } catch (e) {
        return cb && cb(e);
      }
    }

    return cb && cb(null, result);
  };
}

const methods = {
  create: (...args) => redisStore(...args),
};

module.exports = methods;
