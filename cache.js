const intranet = require('intranet');
const credentials = require('./config/credentials.json');
const redis = require('redis');
const config = require('./config/redis.json');

const args = require('minimist')(process.argv.slice(2), {
    alias: {
        h: 'help',
        b: 'benevoles'
    }
});

const session = new intranet.IntranetSession(credentials.url, credentials.user, credentials.password);

function DB (options) {
    const client = redis.createClient(options);
    this.sadd = function (key, val) {
        return new Promise((resolve, reject) => {
            client.sadd(key, val, (err, reply) => {
                if (!err) {
                    resolve(reply);
                } else {
                    reject(err);
                }
            });
        });
    };
    this.hset = function (key, field, val) {
        return new Promise((resolve, reject) => {
            client.hset(key, field, val, (err, reply) => {
                if (!err) {
                    resolve(reply);
                } else {
                    reject(err);
                }
            });
        });
    };
    this.hmset = function (key, field1, val1, field2, val2) {
        return new Promise((resolve, reject) => {
            client.hmset(key, field1, val1, field2, val2, (err, reply) => {
                if (!err) {
                    resolve(reply);
                } else {
                    reject(err);
                }
            });
        });
    };
    this.close = function () {
        client.end(true);
    };
}

function loadBenevoles (db, structure, page = 0, count = 0) {
    return session.get('/crf/rest/utilisateur?action=19&pageInfo=true&searchType=benevoles&structure=' + structure + '&page=' + page).then(response => {
        console.log(response.body);
        const data = JSON.parse(response.body);
        const promises = [];
        data.content.forEach(item => {
            promises.push(db.sadd('structure:' + structure, item.id));
            promises.push(db.hmset('benevole:' + item.id, 'nom', item.nom, 'prenom', item.prenom));
        });
        return Promise.all(promises).then(() => {
            count += data.content.length;
            if (count < data.totalElements) {
                return loadBenevoles(db, structure, page + 1, count);
            }
        });
    });
}

if (args.b) {
    const db = new DB({ host: config.host });
    loadBenevoles(db, args.b).then(() => {
        db.close();
    }).catch(err => {
        console.error(err);
    });
}
