const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.get('/', auth, managerController.getManagers);
router.post('/', auth, isAdmin, managerController.createManager);
router.put('/:id', auth, isAdmin, managerController.updateManager);
router.delete('/:id', auth, isAdmin, managerController.deleteManager);
router.get('/lookup/:id', auth, managerController.getManagerById);

module.exports = router;
