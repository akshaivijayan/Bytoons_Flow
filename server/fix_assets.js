const db = require('./database');

async function fixAssetIds() {
    try {
        const assets = await db.query('SELECT * FROM assets');
        for (const asset of assets) {
            if (!asset.assetId) {
                const newAssetId = `#AST-${asset.serialNumber.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;
                await db.execute('UPDATE assets SET assetId = ? WHERE id = ?', [newAssetId, asset.id]);
                console.log(`Populated Asset ${asset.id} with AssetId ${newAssetId}`);
            }
        }
        console.log('--- ASSET ID POPULATION COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Fix failed:', err.message);
        process.exit(1);
    }
}

fixAssetIds();
