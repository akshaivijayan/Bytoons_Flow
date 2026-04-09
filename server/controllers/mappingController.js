const { AssetAssignment, Asset, Employee } = require('../models');

/**
 * Mapping Controller: Manages historical asset-personnel relationships.
 * Standardizes the relational data extraction for the audit trail.
 */
const mappingController = {
    /**
     * getHistory: Fetches and populates the full historical ledger.
     */
    async getHistory(req, res) {
        try {
            // Fetch all assignments, latest first
            const history = await AssetAssignment.find();
            
            // Manual population for IDs to satisfy relational data requirements
            const populatedHistory = await Promise.all(history.map(async (record) => {
                const asset = await Asset.findById(record.assetId);
                const employee = await Employee.findById(record.employeeId);
                
                return {
                    ...record,
                    asset: asset ? { 
                        name: asset.assetName, 
                        serial: asset.serialNumber, 
                        category: asset.assetCategory 
                    } : { name: 'Deleted Asset' },
                    employee: employee ? { 
                        name: employee.name, 
                        department: employee.department, 
                        email: employee.email 
                    } : { name: 'Unknown Employee' }
                };
            }));

            // Return reverse order (newest at bottom of table is UI choice, but let's send reverse for audit chronos)
            res.json(populatedHistory.reverse()); 
        } catch (err) {
            console.error('[MappingController] Fetch history failed:', err.message);
            res.status(500).json({ message: 'Failed to retrieve relational audit history' });
        }
    }
};

module.exports = mappingController;
