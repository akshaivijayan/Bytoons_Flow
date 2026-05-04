const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// Only Administrators can view the full system audit log
router.get('/', auth, isAdmin, auditController.getAuditLog);

module.exports = router;
