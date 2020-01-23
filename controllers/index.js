const express = require('express');
const path = require('path');
const auth = require('../middlewares/auth');

const router = express.Router();

router.get('/', auth(), (req, res) => {
    res.sendFile(path.join(__dirname, '../html/index.html'));
});

router.get('/admin', auth('Admin'), (req, res) => {
    res.sendFile(path.join(__dirname, '../html/admin.html'));
});

router.use(require('./login'));
router.use('/rest', require('./rest'));

module.exports = router;
