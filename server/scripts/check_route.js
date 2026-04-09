const http = require('http');

async function check() {
    console.log('--- ROUTE CHECK ---');
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/employees/onboard/assets',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`Status Code: ${res.statusCode}`);
        res.on('data', (d) => {
            // process.stdout.write(d);
        });
    });

    req.on('error', (error) => {
        console.error('Error:', error);
    });

    req.end();
}

check();
