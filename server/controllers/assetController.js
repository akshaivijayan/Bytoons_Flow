const { Asset, AuditLog, AssetAssignment } = require('../models');
const { pick, isNonEmptyString } = require('../utils/validation');

const ASSET_FIELDS = ['assetId', 'serialNumber', 'assetName', 'assetCategory', 'assetStatus', 'assignedTo', 'checkOutDate'];
const VALID_ASSET_STATUS = new Set(['AVAILABLE', 'IN USE', 'MAINTENANCE', 'RETIRED']);

function sanitizeAssetPayload(body) {
    const payload = pick(body || {}, ASSET_FIELDS);
    if (payload.assetName && !isNonEmptyString(payload.assetName)) {
        return { error: 'Invalid asset name' };
    }
    if (payload.assetCategory && !isNonEmptyString(payload.assetCategory)) {
        return { error: 'Invalid asset category' };
    }
    if (payload.assetStatus && !VALID_ASSET_STATUS.has(String(payload.assetStatus).toUpperCase())) {
        return { error: 'Invalid asset status' };
    }
    if (payload.assetStatus) {
        payload.assetStatus = String(payload.assetStatus).toUpperCase();
    }
    return { payload };
}

exports.getAssets = async (req, res) => {
    try {
        const assets = await Asset.find().populate('assignedTo');
        res.json(assets);
    } catch (err) {
        console.error('getAssets error:', err);
        res.status(500).send('Server Error');
    }
};

exports.createAsset = async (req, res) => {
    try {
        const { payload, error } = sanitizeAssetPayload(req.body);
        if (error) return res.status(400).json({ message: error });
        if (!payload.assetName || !payload.assetCategory) {
            return res.status(400).json({ message: 'Asset name and category are required' });
        }

        // Auto-generate Asset ID if not provided
        if (!payload.assetId || payload.assetId === '') {
            payload.assetId = await Asset.generateNextAssetId(payload.assetCategory);
        }

        const newAsset = Asset(payload);
        const asset = await newAsset.save();

        // If created with initial assignment, record it in history
        if (payload.assignedTo) {
            const assignment = AssetAssignment({
                assetId: asset.id,
                employeeId: payload.assignedTo,
                assignedDate: new Date().toISOString(),
                notes: 'Initial assignment on asset ingestion'
            });
            await assignment.save();
        }

        // Audit log
        AuditLog.log('CREATE', 'asset', asset.id, req.user?.id, `Created asset: ${asset.assetName}`);

        res.json(asset);
    } catch (err) {
        console.error('createAsset error:', err);
        res.status(500).send('Server Error');
    }
};

exports.updateAsset = async (req, res) => {
    try {
        const oldAsset = await Asset.findById(req.params.id);
        if (!oldAsset) return res.status(404).json({ message: 'Asset not found' });

        const { payload, error } = sanitizeAssetPayload(req.body);
        if (error) return res.status(400).json({ message: error });
        if (Object.keys(payload).length === 0) return res.status(400).json({ message: 'No valid fields to update' });

        const asset = await Asset.findByIdAndUpdate(req.params.id, { $set: payload });
        
        // --- Historical Mapping Persistence ---
        const oldEmpId = oldAsset.assignedTo;
        const newEmpId = payload.assignedTo;

        // If the assignment has changed manually via update
        if (payload.hasOwnProperty('assignedTo') && newEmpId !== oldEmpId) {
            const now = new Date().toISOString();
            
            // 1. Close previous active assignment if exists
            if (oldEmpId) {
                const history = await AssetAssignment.find({ assetId: req.params.id, employeeId: oldEmpId });
                const active = history.filter(h => !h.returnDate || h.returnDate === '');
                if (active.length > 0) {
                    for (const aa of active) {
                        await AssetAssignment.findByIdAndUpdate(aa.id, { returnDate: now });
                    }
                }
            }

            // 2. Open new assignment if assignedTo is provided
            if (newEmpId) {
                const mapping = AssetAssignment({
                    assetId: req.params.id,
                    employeeId: newEmpId,
                    assignedDate: now,
                    notes: `System-generated mapping via registry update`
                });
                await mapping.save();
            }
        }

        // Audit log
        AuditLog.log('UPDATE', 'asset', req.params.id, req.user?.id, `Updated asset: ${JSON.stringify(req.body)}`);

        // Return populated asset for UI consistency
        const updatedAssets = await Asset.find({ id: req.params.id }).populate('assignedTo');
        res.json(updatedAssets[0]);
    } catch (err) {
        console.error('updateAsset error:', err);
        res.status(500).send('Server Error');
    }
};

exports.deleteAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(404).json({ message: 'Asset not found' });

        await Asset.findByIdAndDelete(req.params.id);

        // Audit log
        AuditLog.log('DELETE', 'asset', req.params.id, req.user?.id, `Deleted asset: ${asset.assetName}`);

        res.json({ message: 'Asset removed' });
    } catch (err) {
        console.error('deleteAsset error:', err);
        res.status(500).send('Server Error');
    }
};
