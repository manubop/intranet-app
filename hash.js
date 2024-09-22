const bcrypt = require('bcryptjs');
const redis = require('redis');
const config = require('./config/redis.json');

const client = redis.createClient({
    host: config.host,
    retry_strategy: function () {
        return new Error('shit');
    },
});

client.on('error', function (err) {
    console.error(err);
});

const args = require('minimist')(process.argv.slice(2), {
    alias: {
        h: 'help',
        u: 'user',
        n: 'name',
        p: 'password',
        r: 'role',
        s: 'salt-rounds',
    },
});

if (args.h) {
    const path = require('path');
    console.log('Usage: ' + path.basename(__filename) + ' <password> [<password> ...]');
    process.exit(1);
}

const saltRounds = args.s || 10;

bcrypt.hash(args.password, saltRounds, (err, hash) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    client.hmset('user:' + args.user, 'name', args.name, 'password', hash, 'role', args.role, (err, reply) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(reply);
        client.end(true);
    });
});
