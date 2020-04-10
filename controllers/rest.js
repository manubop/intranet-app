const express = require('express');
const intranet = require('intranet');
const auth = require('../middlewares/auth');
const credentials = require('../config/credentials.json');
const db = require('../db/db');

const session = new intranet.IntranetSession(credentials.url, credentials.user, credentials.password);

const router = express.Router();

router.get('/utilisateur/:nivol', auth(), (req, res) => {
    db.getCachedResponse(req.url).then(data => {
        if (data) {
            res.send(data);
        } else {
            const { debut, fin } = req.query;
            const { nivol } = req.params;
            session.get('/crf/rest/utilisateur/' + nivol + '/inscription?debut=' + debut + '&fin=' + fin).then(data => {
                res.send(data.body);
                db.setCachedResponse(req.url, data.body, 1000 * 60);
            });
        }
    });
});

router.get('/activite/:id', auth(), (req, res) => {
    db.getCachedResponse(req.url).then(data => {
        if (data) {
            res.send(data);
        } else {
            const { id } = req.params;
            session.get('/crf/rest/activite/' + id).then(data => {
                res.send(data.body);
                db.setCachedResponse(req.url, data.body, 1000 * 60);
            });
        }
    });
});

/**
 * @param {string} structure
 * @param {number} page
 * @param {number} count
 * @returns {Promise}
 */
function loadBenevoles (structure, page = 0, count = 0) {
    return session.get('/crf/rest/utilisateur?action=19&pageInfo=true&searchType=benevoles&structure=' + structure + '&page=' + page).then(response => {
        const data = JSON.parse(response.body);
        const benevoles = data.list.map(item => {
            return {
                id: item.id,
                nom: item.nom,
                prenom: item.prenom
            };
        });
        count += data.list.length;
        if (count < data.total) {
            return loadBenevoles(structure, page + 1, count).then(result => {
                return benevoles.concat(result);
            });
        }
        return benevoles;
    });
}

router.get('/benevoles/:structure', auth(), (req, res) => {
    const { structure } = req.params;
    db.getStructure(structure).then(reply => {
        const promises = [];
        reply.forEach(nivol => {
            promises.push(db.getBenevole(nivol));
        });
        Promise.all(promises).then(result => {
            res.send(result);
        });
    }).catch(() => {
        loadBenevoles(structure).then(result => {
            res.send(result);
        });
    });
});

router.get('/seance/:id', auth(), (req, res) => {
    db.getCachedResponse(req.url).then(data => {
        if (data) {
            res.send(data);
        } else {
            const { id } = req.params;
            session.get('/crf/rest/seance/' + id + '/inscription').then(data => {
                res.send(data.body);
                db.setCachedResponse(req.url, data.body, 1000 * 60);
            });
        }
    });
});

router.get('/structure/:id', auth(), (req, res) => {
    db.getCachedResponse(req.url).then(data => {
        if (data) {
            res.send(data);
        } else {
            const { id } = req.params;
            session.get('/crf/rest/structure/' + id).then(data => {
                res.send(data.body);
                db.setCachedResponse(req.url, data.body, 1000 * 60);
            });
        }
    });
});

module.exports = router;
