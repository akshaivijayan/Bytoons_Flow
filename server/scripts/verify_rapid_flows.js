const { Employee, Asset, AssetAssignment } = require('./server/models');

async function testRapidFlows() {
    console.log('--- STARTING RAPID FLOWS VERIFICATION ---');
    try {
        // 1. Setup: Ensure we have an available asset
        let asset = await Asset.findOne({ assetStatus: 'AVAILABLE' });
        if (!asset) {
            console.log('Creating a dummy available asset for testing...');
            const newAsset = Asset({ 
                id: 'test_asset_001', 
                assetId: 'TEST-001', 
                assetName: 'Test Laptop', 
                assetCategory: 'Laptop', 
                assetStatus: 'AVAILABLE' 
            });
            asset = await newAsset.save();
        }
        console.log('[OK] Using asset:', asset.assetName, `(${asset.id})`);

        // 2. Simulate Onboarding (calling the logic directly for speed)
        console.log('Testing Rapid Onboarding...');
        const ctrl = require('./server/controllers/employeeController');
        
        // Mock res object
        const res = {
            status: function(s) { this.statusCode = s; return this; },
            json: function(data) { this.data = data; return this; },
            send: function(msg) { this.msg = msg; return this; }
        };

        const onboardPayload = {
            body: {
                name: 'Rapid Test User',
                email: 'rapid.test@example.com',
                department: 'Engineering',
                manager: 'Sarah J.',
                selectedAssetIds: [asset.id]
            },
            user: { id: 'admin_1' }
        };

        await ctrl.onboardEmployee(onboardPayload, res);
        if (res.statusCode === 400 || res.statusCode === 500) {
            throw new Error(`Onboarding failed: ${res.data?.message || res.msg}`);
        }
        const newEmpId = res.data.employee.id;
        console.log('[OK] Employee onboarded:', newEmpId);

        // 3. Verify Asset Assignment
        const assignedAsset = await Asset.findById(asset.id);
        if (assignedAsset.assetStatus !== 'IN USE' || assignedAsset.assignedTo !== newEmpId) {
            throw new Error('Asset not correctly assigned!');
        }
        console.log('[OK] Asset status updated to IN USE.');

        // 4. Verify Historical Record
        const history = await AssetAssignment.find({ assetId: asset.id, employeeId: newEmpId });
        if (history.length === 0 || history[0].returnDate) {
            throw new Error('Asset assignment record NOT found or has returnDate!');
        }
        console.log('[OK] Historical assignment record created.');

        // 5. Simulate Offboarding
        console.log('Testing Rapid Offboarding...');
        const offboardPayload = {
            params: { id: newEmpId },
            user: { id: 'admin_1' }
        };

        await ctrl.offboardEmployee(offboardPayload, res);
        if (res.statusCode === 400 || res.statusCode === 500) {
            throw new Error(`Offboarding failed: ${res.data?.message || res.msg}`);
        }
        console.log('[OK] Employee offboarded.');

        // 6. Verify Reclamation
        const reclaimedAsset = await Asset.findById(asset.id);
        if (reclaimedAsset.assetStatus !== 'AVAILABLE' || reclaimedAsset.assignedTo !== null) {
            throw new Error('Asset not correctly reclaimed!');
        }
        console.log('[OK] Asset status updated to AVAILABLE.');

        // 7. Verify Return Record
        const updatedHistory = await AssetAssignment.find({ assetId: asset.id, employeeId: newEmpId });
        if (!updatedHistory[0].returnDate) {
            throw new Error('Asset returnDate NOT recorded in history!');
        }
        console.log('[OK] Return date recorded in history.');

        console.log('[SUCCESS] All Rapid flows verified.');
        process.exit(0);

    } catch (err) {
        console.error('[FAILURE] Rapid flows check failed:', err.message);
        process.exit(1);
    }
}

setTimeout(testRapidFlows, 2000);
