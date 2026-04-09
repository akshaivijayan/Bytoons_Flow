async function verifyFlow() {
    try {
        const baseUrl = 'http://localhost:5000/api';
        console.log('--- SYSTEM FLOW VERIFICATION ---');

        // 1. Login
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@precision.com', password: 'adminpassword' })
        });
        const { token } = await loginRes.json();
        const headers = { 'x-auth-token': token, 'Content-Type': 'application/json' };

        // 2. Refresh Stats
        console.log('1. Checking Stats...');
        const statsRes = await fetch(`${baseUrl}/stats`, { headers });
        const stats = await statsRes.json();
        console.log('Stats Categories:', Object.keys(stats.categories || {}));

        // 3. Get Onboarding Assets
        console.log('2. Fetching Onboarding Asset Pool...');
        const assetsRes = await fetch(`${baseUrl}/employees/onboard/assets`, { headers });
        if (assetsRes.status === 404) throw new Error('404 on /api/employees/onboard/assets - Route missing!');
        const assets = await assetsRes.json();
        console.log('Available Asset Categories:', Object.keys(assets));

        // 4. Execute Onboard
        console.log('3. Executing Rapid Onboard...');
        const testPayload = {
            name: 'Verification Bot',
            email: 'bot@precision.com',
            department: 'Engineering',
            manager: 'Sarah J.',
            selectedAssetIds: [] // No assets for simple verification
        };
        const onboardRes = await fetch(`${baseUrl}/employees/onboard`, {
            method: 'POST',
            headers,
            body: JSON.stringify(testPayload)
        });
        const onboardResult = await onboardRes.json();
        const empId = onboardResult.employee?.id;
        console.log('Result:', onboardResult.employee?.name, 'ID:', empId);

        // 5. Execute Offboard
        if (empId) {
            console.log('4. Executing Rapid Offboard...');
            const offboardRes = await fetch(`${baseUrl}/employees/${empId}/offboard`, {
                method: 'POST',
                headers
            });
            const offboardResult = await offboardRes.json();
            console.log('Offboard Status:', offboardResult.message);
        }

        console.log('--- VERIFICATION SUCCESSFUL ---');
    } catch (err) {
        console.error('VERIFICATION FAILED:', err.message);
        process.exit(1);
    }
}

verifyFlow();
