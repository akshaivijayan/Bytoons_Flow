const { Employee, Asset, AuditLog, AssetAssignment, Category } = require('../models');
const { pick, isNonEmptyString, isValidEmail } = require('../utils/validation');

const EMPLOYEE_FIELDS = ['name', 'email', 'phone', 'department', 'manager', 'status'];
const VALID_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']);

function sanitizeEmployeePayload(body) {
    const payload = pick(body || {}, EMPLOYEE_FIELDS);
    if (payload.email && !isValidEmail(payload.email)) {
        return { error: 'Invalid email' };
    }
    if (payload.name && !isNonEmptyString(payload.name)) {
        return { error: 'Invalid name' };
    }
    if (payload.status && !VALID_STATUSES.has(String(payload.status).toUpperCase())) {
        return { error: 'Invalid status' };
    }
    if (payload.status) {
        payload.status = String(payload.status).toUpperCase();
    }
    return { payload };
}

exports.getEmployees = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) {
            query.status = req.query.status.toUpperCase();
        }
        
        const employees = await Employee.find(query).populate('assignedAssets');
        res.json(employees);
    } catch (err) {
        console.error('getEmployees error:', err);
        res.status(500).send('Server Error');
    }
};

exports.createEmployee = async (req, res) => {
    try {
        const { payload, error } = sanitizeEmployeePayload(req.body);
        if (error) return res.status(400).json({ message: error });
        if (!payload.name) return res.status(400).json({ message: 'Name is required' });

        const nextId = await Employee.generateNextEmployeeId();
        const newEmployee = Employee({ ...payload, id: nextId });
        const employee = await newEmployee.save();

        // Audit log
        AuditLog.log('CREATE', 'employee', employee.id, req.user?.id, `Created employee: ${employee.name}`);

        res.json(employee);
    } catch (err) {
        console.error('createEmployee error:', err);
        res.status(500).send('Server Error');
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        let employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const { payload, error } = sanitizeEmployeePayload(req.body);
        if (error) return res.status(400).json({ message: error });
        if (Object.keys(payload).length === 0) return res.status(400).json({ message: 'No valid fields to update' });

        employee = await Employee.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true });

        // Audit log
        AuditLog.log('UPDATE', 'employee', req.params.id, req.user?.id, `Updated employee: ${JSON.stringify(req.body)}`);

        res.json(employee);
    } catch (err) {
        console.error('updateEmployee error:', err);
        res.status(500).send('Server Error');
    }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        // 0. Release Assets & Record Return (Audit Integrity)
        const assignedAssets = await Asset.find({ assignedTo: req.params.id });
        const now = new Date().toISOString();
        for (const asset of assignedAssets) {
            await Asset.findByIdAndUpdate(asset.id, { 
                assetStatus: 'AVAILABLE', 
                assignedTo: null,
                checkOutDate: null 
            });

            // Update Historical Record
            const history = await AssetAssignment.find({ assetId: asset.id, employeeId: req.params.id });
            const active = history.filter(a => !a.returnDate || a.returnDate === '');
            for (const aa of active) {
                await AssetAssignment.findByIdAndUpdate(aa.id, { 
                    returnDate: now,
                    notes: (aa.notes || '') + ' | Automated release on employee deletion'
                });
            }
        }

        await Employee.findByIdAndDelete(req.params.id);

        // Audit log
        AuditLog.log('DELETE', 'employee', req.params.id, req.user?.id, `Deleted employee: ${employee.name}. ${assignedAssets.length} assets released.`);

        res.json({ message: 'Employee removed' });
    } catch (err) {
        console.error('deleteEmployee error:', err);
        res.status(500).send('Server Error');
    }
};

// Specialized Workflow: Onboarding
exports.getOnboardingAssets = async (req, res) => {
    try {
        const availableAssets = await Asset.find({ assetStatus: 'AVAILABLE' });
        const categories = {};
        
        availableAssets.forEach(a => {
            const cat = a.assetCategory || 'OTHER';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(a);
        });
        res.json(categories);
    } catch (err) {
        console.error('getOnboardingAssets error:', err);
        res.status(500).json({ message: 'Failed to fetch onboarding assets' });
    }
};

exports.onboardEmployee = async (req, res) => {
    try {
        const { payload, error } = sanitizeEmployeePayload(req.body);
        if (error) return res.status(400).json({ message: error });
        if (!payload.name) return res.status(400).json({ message: 'Name is required' });

        const selectedAssetIds = (req.body.selectedAssetIds || []).filter(id => id && id !== '');

        // 0. Preliminary validation of assets
        for (const assetId of selectedAssetIds) {
            const asset = await Asset.findById(assetId);
            if (!asset || asset.assetStatus !== 'AVAILABLE') {
                return res.status(400).json({ message: `Asset "${assetId}" is no longer available.` });
            }
        }

        // 1. Create Employee
        const nextId = await Employee.generateNextEmployeeId();
        const newEmployee = Employee({ ...payload, id: nextId, status: 'ACTIVE' });
        const employee = await newEmployee.save();

        // 2. Assign Assets & Record Assignment
        for (const assetId of selectedAssetIds) {
            await Asset.findByIdAndUpdate(assetId, { 
                assetStatus: 'IN USE', 
                assignedTo: employee.id,
                checkOutDate: new Date().toISOString()
            });

            // Historical Record
            const assignment = AssetAssignment({
                assetId: assetId,
                employeeId: employee.id,
                assignedDate: new Date().toISOString(),
                notes: 'Rapid Onboard Assignment'
            });
            await assignment.save();
        }

        AuditLog.log('WORKFLOW', 'employee', employee.id, req.user?.id, `Rapid Onboard: ${employee.name} with ${selectedAssetIds.length} assets`);

        res.json({ employee, assignedCount: selectedAssetIds.length });
    } catch (err) {
        console.error('onboardEmployee error:', err);
        res.status(500).send('Server Error');
    }
};

// Specialized Workflow: Offboarding
exports.offboardEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        // 1. Release Assets & Record Return
        const assignedAssets = await Asset.find({ assignedTo: employee.id });
        for (const asset of assignedAssets) {
            await Asset.findByIdAndUpdate(asset.id, { 
                assetStatus: 'AVAILABLE', 
                assignedTo: null,
                checkOutDate: null 
            });

            // Update Historical Record (find the most recent active assignment)
            const history = await AssetAssignment.find({ assetId: asset.id, employeeId: employee.id });
            const active = history.filter(a => !a.returnDate || a.returnDate === '');
            if (active.length > 0) {
                for (const aa of active) {
                    await AssetAssignment.findByIdAndUpdate(aa.id, { 
                        returnDate: new Date().toISOString(),
                        notes: (aa.notes || '') + ' | Rapid Offboard Return'
                    });
                }
            }
        }

        // 2. Deactivate Employee
        await Employee.findByIdAndUpdate(employee.id, { status: 'INACTIVE' });

        AuditLog.log('WORKFLOW', 'employee', employee.id, req.user?.id, `Rapid Offboard: ${employee.name}. ${assignedAssets.length} assets reclaimed.`);

        res.json({ message: 'Successfully offboarded', reclaimedCount: assignedAssets.length });
    } catch (err) {
        console.error('offboardEmployee error:', err);
        res.status(500).send('Server Error');
    }
};
