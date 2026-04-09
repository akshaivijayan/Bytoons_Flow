const fs = require('fs');
const path = require('path');
const db = require('./database');

const DB_JSON = path.join(__dirname, 'db.json');

async function migrate() {
    if (!fs.existsSync(DB_JSON)) {
        console.log('No db.json found for migration.');
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(DB_JSON, 'utf8'));
        console.log('Starting migration from JSON to SQLite...');

        // Wait a bit for tables to be created (serialize in database.js handles it mostly but let's be safe)
        setTimeout(async () => {
            // Migrating Users
            for (const user of data.users) {
                await db.execute(
                    'INSERT OR IGNORE INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
                    [user._id, user.name, user.email, user.password]
                );
            }
            console.log(`Migrated ${data.users.length} users.`);

            // Migrating Employees
            for (const emp of data.employees) {
                await db.execute(
                    'INSERT OR IGNORE INTO employees (id, name, email, phone, department, manager, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [emp._id, emp.name, emp.email, emp.phone, emp.department, emp.manager, emp.status]
                );
            }
            console.log(`Migrated ${data.employees.length} employees.`);

            // Migrating Assets
            for (const asset of data.assets) {
                await db.execute(
                    'INSERT OR IGNORE INTO assets (id, serialNumber, assetName, assetCategory, assetStatus, assignedTo, checkOutDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [asset._id, asset.serialNumber, asset.assetName, asset.assetCategory, asset.assetStatus, asset.assignedTo, asset.checkOutDate]
                );
            }
            console.log(`Migrated ${data.assets.length} assets.`);

            console.log('--- MIGRATION COMPLETE ---');
            process.exit(0);
        }, 1000);

    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
