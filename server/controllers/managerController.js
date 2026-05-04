const { Manager, Employee, AuditLog } = require('../models');
const { pick, isNonEmptyString } = require('../utils/validation');

const MANAGER_FIELDS = ['employeeId', 'managedDepartment'];

function sanitizeManagerPayload(body) {
    const payload = pick(body || {}, MANAGER_FIELDS);
    if (payload.managedDepartment && !isNonEmptyString(payload.managedDepartment)) {
        return { error: 'Invalid managed department' };
    }
    return { payload };
}

exports.getManagers = async (req, res) => {
    try {
        const managers = await Manager.find().populate('employeeId');
        res.json(managers);
    } catch (err) {
        console.error('getManagers error:', err);
        res.status(500).send('Server Error');
    }
};

exports.createManager = async (req, res) => {
    try {
        const { payload, error } = sanitizeManagerPayload(req.body);
        if (error) return res.status(400).json({ message: error });
        const { employeeId, managedDepartment } = payload;
        if (!employeeId) return res.status(400).json({ message: 'employeeId is required' });
        
        // Ensure employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        // Ensure not already a manager
        const existing = await Manager.findOne({ employeeId });
        if (existing) return res.status(400).json({ message: 'Employee is already a manager' });

        const newManager = Manager({ employeeId, managedDepartment });
        const manager = await newManager.save();

        // Audit log
        await AuditLog.log('PROMOTE', 'manager', manager.id, req.user?.id, `Promoted employee ${employee.name} to manager`);

        res.json(manager);
    } catch (err) {
        console.error('createManager error:', err);
        res.status(500).send('Server Error');
    }
};

exports.updateManager = async (req, res) => {
    try {
        let manager = await Manager.findById(req.params.id);
        if (!manager) return res.status(404).json({ message: 'Manager not found' });

        const { payload, error } = sanitizeManagerPayload(req.body);
        if (error) return res.status(400).json({ message: error });
        if (Object.keys(payload).length === 0) return res.status(400).json({ message: 'No valid fields to update' });

        manager = await Manager.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true });

        // Audit log
        await AuditLog.log('UPDATE', 'manager', req.params.id, req.user?.id, `Updated manager registry: ${JSON.stringify(req.body)}`);

        res.json(manager);
    } catch (err) {
        console.error('updateManager error:', err);
        res.status(500).send('Server Error');
    }
};

exports.getManagerById = async (req, res) => {
    try {
        const manager = await Manager.findById(req.params.id);
        if (!manager) return res.status(404).json({ message: 'Manager not found' });
        
        // Populate employee data
        const employee = await Employee.findById(manager.employeeId);
        manager.employee = employee;
        
        res.json(manager);
    } catch (err) {
        console.error('getManagerById error:', err);
        res.status(500).send('Server Error');
    }
};

exports.deleteManager = async (req, res) => {
    try {
        const manager = await Manager.findById(req.params.id);
        if (!manager) return res.status(404).json({ message: 'Manager not found' });

        await Manager.findByIdAndDelete(req.params.id);

        // Audit log
        await AuditLog.log('DELETE', 'manager', req.params.id, req.user?.id, `Removed manager from registry (Employee record remains)`);

        res.json({ message: 'Manager removed from registry' });
    } catch (err) {
        console.error('deleteManager error:', err);
        res.status(500).send('Server Error');
    }
};
