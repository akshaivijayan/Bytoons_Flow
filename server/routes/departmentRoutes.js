const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.get('/', auth, departmentController.getDepartments);
router.post('/', auth, isAdmin, departmentController.createDepartment);
router.delete('/:id', auth, isAdmin, departmentController.deleteDepartment);

module.exports = router;
