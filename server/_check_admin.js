const db = require('./database');
const bcrypt = require('bcryptjs');

setTimeout(async () => {
    try {
        // Check admin user
        const admin = await db.getOne("SELECT * FROM users WHERE email = 'admin@bytoons.com'");
        if (admin) {
            console.log('Admin found:', { id: admin.id, name: admin.name, email: admin.email });
            console.log('Password hash:', admin.password);
            console.log('Hash length:', admin.password ? admin.password.length : 'NULL');

            // Test if password123 matches
            const match = await bcrypt.compare('password123', admin.password);
            console.log('Does "password123" match?', match);
        } else {
            console.log('NO ADMIN USER FOUND IN DATABASE');
        }

        // Check all users
        const users = await db.query('SELECT id, name, email FROM users');
        console.log('All users:', users);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}, 1000);
