const express = require('express');
const intranet = require('intranet');
const auth = require('../middlewares/auth');
const credentials = require('../config/credentials.json');
const db = require('../db/db');

const session = new intranet.IntranetSession(credentials.url, credentials.user, credentials.password);

const router = express.Router();

const dl = (() => {
    /**
     * @param {string} structure
     * @param {number} page
     * @param {number} count
     * @returns {Promise}
     */
    function loadBenevoles (structure, page = 0, count = 0) {
        return session.get('/crf/rest/utilisateur?action=19&pageInfo=true&searchType=benevoles&structure=' + structure + '&page=' + page).then(response => {
            const data = JSON.parse(response.body);
            const benevoles = data.content.map(item => {
                return {
                    id: item.id,
                    nom: item.nom,
                    prenom: item.prenom
                };
            });
            count += data.content.length;
            if (count < data.totalElements) {
                return loadBenevoles(structure, page + 1, count).then(result => {
                    return benevoles.concat(result);
                });
            }
            return benevoles;
        });
    }

    return {
        tryGetFromCache: async function (key) {
            try {
                return await db.getCachedResponse(key);
            } catch (e) {
                console.error(e);
            }
            return null;
        },
        tryGetFromUrl: async function (url, key, ttl) {
            try {
                const data = await session.get(url);
                if (data) {
                    db.setCachedResponse(key, data.body, ttl).catch(err => {
                        console.error(err);
                    });
                    return data.body;
                }
            } catch (e) {
                console.error(e);
            };
            return null;
        },
        tryGetFromCacheOrUrl: async function (res, key, url) {
            let data = await this.tryGetFromCache(key);
            if (!data) {
                data = await this.tryGetFromUrl(url(), key, 1000 * 60);
            }
            res.send(data);
        },
        downloadBenevoles: function (res, structure) {
            loadBenevoles(structure).then(result => {
                res.send(result);
            }).catch(err => {
                console.error(err);
            });
        }
    };
})();

router.get('/utilisateur/:nivol', auth(), async (req, res) => {
    dl.tryGetFromCacheOrUrl(res, req.url, () => {
        const { debut, fin } = req.query;
        const { nivol } = req.params;
        return '/crf/rest/utilisateur/' + nivol + '/inscription?debut=' + debut + '&fin=' + fin;
    });
});

router.get('/activite/:id', auth(), async (req, res) => {
    dl.tryGetFromCacheOrUrl(res, req.url, () => {
        const { id } = req.params;
        return '/crf/rest/activite/' + id;
    });
});

router.get('/seance/:id', auth(), async (req, res) => {
    dl.tryGetFromCacheOrUrl(res, req.url, () => {
        const { id } = req.params;
        return '/crf/rest/seance/' + id + '/inscription';
    });
});

router.get('/structure/:id', auth(), async (req, res) => {
    dl.tryGetFromCacheOrUrl(res, req.url, () => {
        const { id } = req.params;
        return '/crf/rest/structure/' + id;
    });
});

router.get('/benevoles/:structure', auth(), async (req, res) => {
    const { structure } = req.params;
    try {
        const reply = await db.getStructure(structure);
        if (reply) {
            const promises = reply.map(nivol => db.getBenevole(nivol));
            return Promise.all(promises).then(result => {
                res.send(result);
            }).catch(err => {
                console.error(err);
                dl.downloadBenevoles(res, structure);
            });
        }
    } catch (e) {
        console.err(e);
    }
    dl.downloadBenevoles(res, structure);
});

module.exports = router;
