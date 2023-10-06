// middleware.js
function searchValidator(req, res, next) {
    const { searchText, stratPage, searchUpto } = req.body;

    if (!searchText || typeof searchText !== 'string') {
        return res.status(400).json({ error: 'Invalid searchText parameter.' });
    }

    if (!stratPage || typeof stratPage !== 'number' || stratPage < 1) {
        return res.status(400).json({ error: 'Invalid stratPage parameter.' });
    }

    if (!searchUpto || typeof searchUpto !== 'number' || searchUpto < 1) {
        return res.status(400).json({ error: 'Invalid searchUpto parameter.' });
    }

    next();
}

function jsonValidator(err, req, res, next) {
    if (err instanceof SyntaxError) {
        return res.status(400).json({ error: 'Invalid JSON in the request body.' });
    }
    next();
}

module.exports = { searchValidator, jsonValidator };
