const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('../db/db');

const router = express.Router();

router.get('/login', (req, res) => {
    if (req.user) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, '../html/login.html'));
    }
});

router.post('/login', async (req, res) => {
    const { name, password } = req.body;
    try {
        const user = await db.getUser(name);
        if (!user) {
            console.info(`user ${name} not found`);
            return res.sendStatus(401);
        }
        const hash = user.password;
        const match = await bcrypt.compare(password, hash);
        if (!match) {
            console.info(`password mismatch for user ${name}`);
            return res.sendStatus(401);
        }
        const token = jwt.sign({ name: user.name, role: user.role, ip: req.ip }, process.env.JWT_KEY);
        res.cookie('AuthToken', token, { httpOnly: true });
        res.redirect('/');
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});

router.get('/logout', (req, res) => {
    const user = req.user;
    if (user) {
        res.clearCookie('AuthToken');
    }
    res.redirect('/login');
});

module.exports = router;
