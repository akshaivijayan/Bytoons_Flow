/**
 * Bytoons Flow — SQLite Seed Script
 * Seeds the database with sample data using the Persistent Models layer.
 * Run: node seed.js
 */
/**
 * Bytoons Flow — SQLite Seed Script
 * Seeds the database with sample data using the Persistent Models layer.
 * Run: node seed.js
 */
const { User, Employee, Asset, AuditLog } = require('./models');
const bcrypt = require('bcryptjs');
const config = require('./config');

const seed = async () => {
    try {
        console.log('\n--- BYTOONS FLOW DATABASE DIAGNOSTIC ---\n');

        // 1. Create Admin User (if not exists)
        if (!config.adminEmail || !config.adminPassword) {
            console.log('  [!] Admin bootstrap skipped (missing ADMIN_EMAIL/ADMIN_PASSWORD)');
        }

        const existingAdmin = config.adminEmail ? await User.findOne({ email: config.adminEmail }) : null;
        if (!existingAdmin && config.adminEmail && config.adminPassword) {
            const hashedPassword = await bcrypt.hash(config.adminPassword, 10);
            const admin = User({ id: 'admin_1', name: 'Admin User', email: config.adminEmail, password: hashedPassword, role: 'admin' });
            await admin.save();
            console.log(`  [+] Admin user created: ${config.adminEmail}`);
        } else if (existingAdmin) {
            console.log('  [=] Admin user already exists');
        }

        // 2. Create Sample Employees
        const existingEmp1 = await Employee.findById('emp_1');
        if (!existingEmp1) {
            const emp1 = Employee({ id: 'emp_1', name: 'Marcus Chen', email: 'm.chen@bytoons.com', phone: '+1 555-0102', department: 'Engineering', manager: 'Sarah J.', status: 'ACTIVE' });
            await emp1.save();
            console.log('  [+] Employee created: Marcus Chen');
        }

        const existingEmp2 = await Employee.findById('emp_2');
        if (!existingEmp2) {
            const emp2 = Employee({ id: 'emp_2', name: 'Elena Rodriguez', email: 'e.rodriguez@bytoons.com', phone: '+1 555-0199', department: 'Design', manager: 'David K.', status: 'ACTIVE' });
            await emp2.save();
            console.log('  [+] Employee created: Elena Rodriguez');
        }

        // 3. Create Sample Assets
        const existingAst1 = await Asset.findById('ast_1');
        if (!existingAst1) {
            const ast1 = Asset({ id: 'ast_1', assetId: '#AST-2024-001', serialNumber: 'PA-LP-001', assetName: 'MacBook Pro 16"', assetCategory: 'LAPTOP', assetStatus: 'IN USE', assignedTo: 'emp_1', checkOutDate: new Date().toISOString() });
            await ast1.save();
            console.log('  [+] Asset created: MacBook Pro 16"');
        }

        const existingAst2 = await Asset.findById('ast_2');
        if (!existingAst2) {
            const ast2 = Asset({ id: 'ast_2', assetId: '#AST-2024-002', serialNumber: 'PA-DS-441', assetName: 'Studio Display 5K', assetCategory: 'PERIPHERAL', assetStatus: 'AVAILABLE' });
            await ast2.save();
            console.log('  [+] Asset created: Studio Display 5K');
        }

        // 4. Log seed event
        await AuditLog.log('SEED', 'system', null, 'system', 'Database seeded with sample data');

        console.log('--- SEEDING COMPLETE ---');

        // Wait a moment for writes to flush, then exit
        setTimeout(() => process.exit(0), 500);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

// Allow DB to initialize before seeding
setTimeout(seed, 1000);
