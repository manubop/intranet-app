const express = require('express');
const cookieParser = require('cookie-parser');
const verify = require('./middlewares/verify');
const path = require('path');

const app = express();

app.set('trust proxy', true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(verify());

app.use(require('./controllers'));

app.listen(3000, '127.0.0.1', function () {
    console.log('Example app listening on port 3000!');
});
