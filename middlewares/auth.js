module.exports = function (roles = []) {
    if (typeof roles === 'string') {
        roles = [roles];
    }
    return async (req, res, next) => {
        if (!req.user) {
            if (req.path.indexOf('/rest') === 0) {
                return res.status(401).send({ authorization: 'failed' });
            } else if (req.path.indexOf('/login') !== 0) {
                return res.redirect('/login');
            }
        } else if (roles.length) {
            // const role = await req.user.getRole();
            const role = req.user.role;
            if (!roles.includes(role)) {
                return res.sendStatus(401);
            }
        }
        next();
    };
};
