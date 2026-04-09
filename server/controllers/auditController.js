const db = require('../database');

exports.getAuditLog = async (req, res) => {
    try {
        const rows = await db.query(
            'SELECT * FROM audit_log ORDER BY datetime(createdAt) DESC LIMIT 100'
        );
        const logs = rows.map(r => ({ ...r, _id: r.id }));
        res.json(logs);
    } catch (err) {
        console.error('getAuditLog error:', err);
        res.status(500).send('Server Error');
    }
};
