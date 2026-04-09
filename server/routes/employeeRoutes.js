const express = require('express');
const router = express.Router();
console.log('--- [DEBUG] INITIALIZING EMPLOYEE ROUTES ---');
const employeeController = require('../controllers/employeeController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.get('/onboard/assets', auth, employeeController.getOnboardingAssets);
router.post('/onboard', auth, isAdmin, employeeController.onboardEmployee);
router.post('/:id/offboard', auth, isAdmin, employeeController.offboardEmployee);

router.get('/', auth, employeeController.getEmployees);
router.post('/', auth, isAdmin, employeeController.createEmployee);
router.put('/:id', auth, isAdmin, employeeController.updateEmployee);
router.delete('/:id', auth, isAdmin, employeeController.deleteEmployee);

module.exports = router;
