const jwt = require('jsonwebtoken');

var verify = function () {
    return async (req, res, next) => {
        console.log(req.ip + ' ' + req.method + ' ' + req.path);
        const token = req.cookies.AuthToken;
        if (token) {
            try {
                const user = jwt.verify(token, process.env.JWT_KEY);
                if (user && user.ip === req.ip) {
                    req.user = user;
                }
            } catch (err) {
                console.error('Failed to verify authorization token, clearing cookie...');
                res.clearCookie('AuthToken');
            }
        }
        next();
    };
};

module.exports = verify;
