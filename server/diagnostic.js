const db = require('./database');

async function runDiagnostic() {
    console.log('\n--- BYTOONS FLOW DATABASE DIAGNOSTIC ---\n');
    try {
        // 1. List All Tables
        const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables in db.sqlite:', tables.map(t => t.name).join(', '));

        // 2. Check Managers Table Schema
        if (tables.find(t => t.name === 'managers')) {
            console.log('\n✔ Managers table exists.');
            const schema = await db.query("PRAGMA table_info(managers)");
            console.log('Managers Schema (employeeId logic):');
            console.table(schema.map(s => ({ column: s.name, type: s.type })));

            // 3. Check Sample Data
            const rows = await db.query("SELECT e.name, m.managedDepartment FROM employees e JOIN managers m ON e.id = m.employeeId");
            console.log('\nSeeded Registry Content:');
            console.table(rows);
        } else {
            console.log('\n✖ Managers table NOT FOUND.');
        }

    } catch (err) {
        console.error('Diagnostic Failed:', err.message);
    }
    console.log('\n--- END DIAGNOSTIC ---\n');
    process.exit(0);
}

// Give DB a second to connect if this is run alongside app.js
setTimeout(runDiagnostic, 1000);
