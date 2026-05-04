const { Asset, Employee, AssetAssignment, AuditLog } = require('../models');

/**
 * Report Controller: Manages strategic data-mining and CSV serialization.
 * Centralizes the organizational intelligence for audit and planning.
 */
const reportController = {
    /**
     * isWithinRange: Helper for filtering records based on temporal parameters.
     */
    isWithinRange(dateStr, startDate, endDate) {
        if (!startDate && !endDate) return true;
        if (!dateStr || dateStr === 'N/A' || dateStr === 'Present') return false;
        
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
    },

    /**
     * convertToCSV: Helper to transform JSON records into a standard CSV stream.
     */
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        const keys = Object.keys(data[0]);
        const BOM = '\uFEFF';
        
        const header = keys.map(k => `"${k}"`).join(',');
        const rows = data.map(row => {
            return keys.map(key => {
                let val = row[key];
                if (val === null || val === undefined) val = '';
                if (typeof val === 'object') val = JSON.stringify(val);
                const escaped = ('' + val).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',');
        });
        
        return BOM + [header, ...rows].join('\r\n');
    },

    /**
     * generateReportData: Shared logic for data-mining across different domains.
     */
    async generateReportData(type, startDate, endDate) {
        switch (type) {
            case 'inventory':
                const assets = await Asset.find();
                return assets.map(a => ({
                    'Asset ID': a.assetId || a.id,
                    'Serial Number': a.serialNumber || 'N/A',
                    'Asset Name': a.assetName,
                    'Category': a.assetCategory,
                    'Status': a.assetStatus,
                    'Brand': a.brand || 'N/A',
                    'Model': a.model || 'N/A',
                    'Creation Date': a.createdAt
                })).filter(a => this.isWithinRange(a['Creation Date'], startDate, endDate));

            case 'allocation':
                const allocated = await Asset.find({ assignedTo: { $ne: null } }).populate('assignedTo');
                return allocated.map(a => ({
                    'Asset ID': a.assetId || a.id,
                    'Asset Name': a.assetName,
                    'Serial Number': a.serialNumber || 'N/A',
                    'Employee ID': a.assignedTo?.id || 'N/A',
                    'Employee Name': a.assignedTo?.name || 'Unknown',
                    'Department': a.assignedTo?.department || 'N/A',
                    'Allocation Date': a.checkOutDate || 'Unknown'
                })).filter(a => this.isWithinRange(a['Allocation Date'], startDate, endDate));

            case 'lifecycle':
                const assignments = await AssetAssignment.find();
                let lifecycleData = await Promise.all(assignments.map(async (record) => {
                    const asset = await Asset.findById(record.assetId);
                    const emp = await Employee.findById(record.employeeId);
                    return {
                        'Asset ID': asset?.assetId || record.assetId,
                        'Asset Name': asset?.assetName || 'Deleted',
                        'Serial': asset?.serialNumber || 'N/A',
                        'Employee': emp?.name || 'Deleted',
                        'Department': emp?.department || 'N/A',
                        'Movement': record.returnDate ? 'RETURN' : 'ASSIGNMENT',
                        'Effective Date': record.returnDate || record.assignedDate,
                        'Notes': record.notes || 'System Entry'
                    };
                }));
                return lifecycleData.filter(d => this.isWithinRange(d['Effective Date'], startDate, endDate));

            case 'audit':
                const logs = await AuditLog.find();
                return logs.map(l => ({
                    'Action': l.action,
                    'Entity': l.entityType,
                    'Reference ID': l.entityId,
                    'Admin ID': l.userId || 'system',
                    'Log Message': l.details || 'No details provided',
                    'Execution Time': l.createdAt || l.timestamp
                })).filter(l => this.isWithinRange(l['Execution Time'], startDate, endDate));

            default:
                throw new Error('Invalid report type');
        }
    },

    /**
     * getData: JSON preview for the frontend.
     */
    async getData(req, res) {
        try {
            const { type, startDate, endDate } = req.query;
            const data = await this.generateReportData(type, startDate, endDate);
            res.json(data);
        } catch (err) {
            console.error('[ReportController] Preview generation failed:', err.message);
            res.status(500).json({ message: 'Failed to generate report dataset' });
        }
    },

    /**
     * exportCSV: Direct streaming of pre-serialized datasets for Excel compatibility.
     */
    async exportCSV(req, res) {
        try {
            const { type, startDate, endDate } = req.query;
            const data = await this.generateReportData(type, startDate, endDate);
            
            const csv = this.convertToCSV(data);
            const date = new Date().toISOString().split('T')[0];
            const filename = `Precision_Report_${type || 'export'}_${date}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        } catch (err) {
            console.error('[ReportController] Export generation failed:', err.message);
            res.status(500).send('Failed to generate export file');
        }
    }
};

module.exports = reportController;
