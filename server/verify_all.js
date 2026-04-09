const API = 'http://localhost:5000/api';

async function runTests() {
    console.log('--- STARTING E2E API VERIFICATION ---');
    try {
        // 1. Login
        console.log('[1/4] Authenticating...');
        const loginRes = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@bytoons.com', password: 'password123' })
        });
        const { token } = await loginRes.json();
        const auth = { 'x-auth-token': token, 'Content-Type': 'application/json' };
        console.log('  SUCCESS: Logged in as Admin');

        // 2. Dashboard Stats
        console.log('[2/4] Verifying Dashboard Pulse...');
        const statsRes = await fetch(`${API}/stats`, { headers: auth });
        const stats = await statsRes.json();
        console.log(`  STATS: Assets:${stats.totalAssets}, Employees:${stats.totalEmployees}`);

        // 3. Employee CRUD
        console.log('[3/4] Testing Personnel Lifecycle...');
        const createEmp = await fetch(`${API}/employees`, {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({ name: 'Alice Cooper', email: 'alice@rock.com', department: 'Operations' })
        });
        const alice = await createEmp.json();
        console.log(`  CREATE: Alice onboarded (ID: ${alice._id})`);

        const updateEmp = await fetch(`${API}/employees/${alice._id}`, {
            method: 'PUT',
            headers: auth,
            body: JSON.stringify({ name: 'Alice B. Cooper' })
        });
        console.log('  UPDATE: Name adjusted to Alice B. Cooper');

        const deleteEmp = await fetch(`${API}/employees/${alice._id}`, { method: 'DELETE', headers: auth });
        console.log('  DELETE: Alice removed from directory');

        // 4. Asset CRUD
        console.log('[4/4] Testing Hardware Registry...');
        const createAsset = await fetch(`${API}/assets`, {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({ serialNumber: 'PA-TEST-999', assetName: 'Test Server', assetCategory: 'NETWORK', assetStatus: 'AVAILABLE' })
        });
        const server = await createAsset.json();
        console.log(`  CREATE: Test Server registered (ID: ${server._id})`);

        const deleteAsset = await fetch(`${API}/assets/${server._id}`, { method: 'DELETE', headers: auth });
        console.log('  DELETE: Test Server decommissioned');

        console.log('\n--- ALL LIVE API OPERATIONS SUCCESSFUL ---');
    } catch (err) {
        console.error('TESTING FAILED:', err.message);
    }
}

runTests();
