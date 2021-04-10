const redis = require('redis');
const config = require('../config/redis.json');

const client = redis.createClient({
    host: config.host,
    retry_strategy: function (options) {
        return new Error('shit');
    }
});

client.on('error', function (err) {
    console.error(err);
});

module.exports = {
    getCachedResponse: function (url) {
        return new Promise((resolve, reject) => {
            client.hgetall('url:' + url, (err, reply) => {
                if (!err) {
                    if (!reply || Date.now() >= reply.expires) {
                        console.log('cache miss: ' + url);
                        resolve(null);
                    } else {
                        console.log('cache hit: ' + url);
                        resolve(reply.payload);
                    }
                } else {
                    reject(err);
                }
            });
        });
    },
    setCachedResponse: function (url, payload, ttl) {
        return new Promise((resolve, reject) => {
            client.hmset('url:' + url, 'payload', payload, 'expires', Date.now() + ttl, (err, reply) => {
                if (!err) {
                    resolve(reply);
                } else {
                    reject(err);
                }
            });
        });
    },
    getUser: function (name) {
        return new Promise((resolve, reject) => {
            client.hgetall('user:' + name, (err, reply) => {
                if (!err) {
                    resolve(reply);
                } else {
                    reject(err);
                }
            });
        });
    },
    getStructure: function (structure) {
        return new Promise((resolve, reject) => {
            client.smembers('structure:' + structure, (err, reply) => {
                if (!err) {
                    resolve(reply);
                } else {
                    reject(err);
                }
            });
        });
    },
    getBenevole: function (id) {
        return new Promise((resolve, reject) => {
            client.hgetall('benevole:' + id, (err, reply) => {
                if (!err) {
                    resolve({ id, ...reply });
                } else {
                    reject(err);
                }
            });
        });
    }
};
