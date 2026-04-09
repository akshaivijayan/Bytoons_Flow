const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'db.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('[DATABASE] CRITICAL: Connection failed:', err.message);
    } else {
        console.log('--- DATABASE ENGINE ACTIVE ---');
        console.log(`--- [SYS] REGISTRY PATH: ${DB_PATH}`);
        db.run('PRAGMA foreign_keys = ON');
        createTables();
    }
});

/**
 * Helper to run queries as promises (Moved EARLY to prevent race conditions)
 */
db.query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

db.getOne = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.execute = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

function createTables() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'admin',
            createdAt TEXT DEFAULT (datetime('now'))
        )`);

        // Employees Table
        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            phone TEXT,
            department TEXT,
            manager TEXT,
            status TEXT DEFAULT 'ACTIVE',
            createdAt TEXT DEFAULT (datetime('now'))
        )`);

        // Assets Table
        db.run(`CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            assetId TEXT,
            serialNumber TEXT UNIQUE,
            assetName TEXT,
            assetCategory TEXT,
            assetStatus TEXT DEFAULT 'AVAILABLE',
            assignedTo TEXT,
            checkOutDate TEXT,
            brand TEXT,
            model TEXT,
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (assignedTo) REFERENCES employees (id) ON DELETE SET NULL
        )`);

        // Departments Table (NEW)
        db.run(`CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            createdAt TEXT DEFAULT (datetime('now'))
        )`);

        // Managers Table
        db.run(`CREATE TABLE IF NOT EXISTS managers (
            id TEXT PRIMARY KEY,
            employeeId TEXT NOT NULL UNIQUE,
            managedDepartment TEXT,
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (employeeId) REFERENCES employees (id) ON DELETE CASCADE
        )`);

        // Categories Table (NEW)
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            createdAt TEXT DEFAULT (datetime('now'))
        )`);

        // Audit Log Table (NEW)
        db.run(`CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            entityType TEXT NOT NULL,
            entityId TEXT,
            userId TEXT,
            details TEXT,
            createdAt TEXT DEFAULT (datetime('now'))
        )`);

        // Asset Assignments Table (NEW) — historical tracking
        db.run(`CREATE TABLE IF NOT EXISTS asset_assignments (
            id TEXT PRIMARY KEY,
            assetId TEXT NOT NULL,
            employeeId TEXT NOT NULL,
            assignedDate TEXT DEFAULT (datetime('now')),
            returnDate TEXT,
            notes TEXT,
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (assetId) REFERENCES assets (id) ON DELETE CASCADE,
            FOREIGN KEY (employeeId) REFERENCES employees (id) ON DELETE CASCADE
        )`);

        // Seed default departments if empty
        db.get('SELECT COUNT(*) as cnt FROM departments', [], (err, row) => {
            if (!err && row && row.cnt === 0) {
                const depts = [
                    ['dept_1', 'ENG', 'Engineering', 'Software & hardware engineering'],
                    ['dept_2', 'DES', 'Design', 'UI/UX and product design'],
                    ['dept_3', 'OPS', 'Operations', 'Business operations & logistics'],
                    ['dept_4', 'LEG', 'Legal', 'Legal & compliance'],
                    ['dept_5', 'MGT', 'Management', 'Executive & management'],
                ];
                const stmt = db.prepare('INSERT OR IGNORE INTO departments (id, code, name, description) VALUES (?, ?, ?, ?)');
                depts.forEach(d => stmt.run(d));
                stmt.finalize();
                console.log('--- DEFAULT DEPARTMENTS SEEDED ---');
            }
        });

        // --- AUTO-MIGRATION SECTION ---
        const tablesToMigrate = {
            users: ['id', 'name', 'email', 'password', 'role', 'createdAt'],
            employees: ['id', 'name', 'email', 'phone', 'department', 'manager', 'status', 'createdAt'],
            assets: ['id', 'assetId', 'serialNumber', 'assetName', 'assetCategory', 'assetStatus', 'assignedTo', 'checkOutDate', 'brand', 'model', 'createdAt'],
            departments: ['id', 'code', 'name', 'description', 'createdAt'],
            managers: ['id', 'employeeId', 'managedDepartment', 'createdAt'],
            categories: ['id', 'code', 'name', 'description', 'createdAt'],
            audit_log: ['id', 'action', 'entityType', 'entityId', 'userId', 'details', 'createdAt'],
            asset_assignments: ['id', 'assetId', 'employeeId', 'assignedDate', 'returnDate', 'notes', 'createdAt']
        };

        Object.entries(tablesToMigrate).forEach(([tableName, columns]) => {
            db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
                if (err || !rows) return;
                const existingColumns = rows.map(r => r.name);
                columns.forEach(col => {
                    if (!existingColumns.includes(col)) {
                        let defaultValue = "NULL";
                        if (col === 'createdAt') defaultValue = "'2024-04-01 00:00:00'";
                        if (col === 'role' && tableName === 'users') defaultValue = "'admin'";
                        const type = "TEXT"; 
                        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${type} DEFAULT ${defaultValue}`, (alterErr) => {
                            if (alterErr) console.error(`Failed to migrate ${tableName} (${col}):`, alterErr.message);
                            else console.log(`--- [SYS] FIXED MISSING COLUMN: ${tableName}.${col} ---`);
                        });
                    }
                });
            });
        });

        // Seed default managers and their corresponding employee records
        db.get('SELECT COUNT(*) as cnt FROM managers', [], (err, row) => {
            if (!err && row && row.cnt === 0) {
                const mgrData = [
                    { id: 'mgr_1', empId: 'emp_mgr_1', name: 'Sarah J.', email: 's.johnson@precision.com', dept: 'Engineering' },
                    { id: 'mgr_2', empId: 'emp_mgr_2', name: 'David K.', email: 'd.knight@precision.com', dept: 'Design' },
                    { id: 'mgr_3', empId: 'emp_mgr_3', name: 'Unnikkuttan', email: 'unnikkuttan@precision.com', dept: 'Management' },
                ];
                
                const empStmt = db.prepare('INSERT OR IGNORE INTO employees (id, name, email, department, status) VALUES (?, ?, ?, ?, ?)');
                const mgrStmt = db.prepare('INSERT OR IGNORE INTO managers (id, employeeId, managedDepartment) VALUES (?, ?, ?)');
                
                mgrData.forEach(m => {
                    empStmt.run([m.empId, m.name, m.email, m.dept, 'ACTIVE']);
                    mgrStmt.run([m.id, m.empId, m.dept]);
                });
                
                empStmt.finalize();
                mgrStmt.finalize();
                console.log('--- INTEGRATED MANAGERS & EMPLOYEES SEEDED ---');
            }
        });

        // Seed default categories if empty
        db.get('SELECT COUNT(*) as cnt FROM categories', [], (err, row) => {
            if (!err && row && row.cnt === 0) {
                const cats = [
                    ['cat_1', 'LAPTOP', 'Laptop', 'Portable computing devices'],
                    ['cat_2', 'MOBILE', 'Mobile', 'Smartphones and tablets'],
                    ['cat_3', 'NETWORK', 'Network', 'Networking equipment (routers, switches, etc.)'],
                    ['cat_4', 'PERIPHERAL', 'Peripheral', 'Monitors, keyboards, mice, etc.'],
                ];
                const stmt = db.prepare('INSERT OR IGNORE INTO categories (id, code, name, description) VALUES (?, ?, ?, ?)');
                cats.forEach(c => stmt.run(c));
                stmt.finalize();
                console.log('--- DEFAULT CATEGORIES SEEDED ---');
            }
        });
    });
}

// Extensions moved to top level

module.exports = db;
