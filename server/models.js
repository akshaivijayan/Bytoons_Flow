const db = require('./database');
const crypto = require('crypto');
const sanitizer = require('./utils/sanitizer');

// Table Schemas for validation — ensures data integrity by filtering incoming keys
const SCHEMAS = {
    users: ['id', 'name', 'email', 'password', 'role', 'createdAt'],
    employees: ['id', 'name', 'email', 'phone', 'department', 'manager', 'status', 'createdAt'],
    assets: ['id', 'assetId', 'serialNumber', 'assetName', 'assetCategory', 'assetStatus', 'assignedTo', 'checkOutDate', 'brand', 'model', 'createdAt'],
    departments: ['id', 'code', 'name', 'description', 'createdAt'],
    categories: ['id', 'code', 'name', 'description', 'createdAt'],
    managers: ['id', 'employeeId', 'managedDepartment', 'createdAt'],
    audit_log: ['id', 'action', 'entityType', 'entityId', 'userId', 'details', 'createdAt'],
    asset_assignments: ['id', 'assetId', 'employeeId', 'assignedDate', 'returnDate', 'notes', 'createdAt']
};

/**
 * BaseModel: A lightweight ORM wrapper for SQLite tables.
 * Provides a clean interface for common database operations while ensuring
 * strict schema validation and error handling.
 */
class BaseModel {
    constructor(tableName) {
        this.tableName = tableName;
    }

    find(query = {}) {
        return new QueryResult(this.tableName, query);
    }

    async findById(id) {
        if (!id) return null;
        const row = await db.getOne(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id.toString()]);
        return row ? { ...row, _id: row.id } : null;
    }

    async findOne(query) {
        const results = await this.find(query);
        return results[0] || null;
    }

    async findByIdAndUpdate(id, update) {
        const fields = sanitizer.clean({ ...update.$set, ...update });
        delete fields.$set;

        const schema = SCHEMAS[this.tableName];
        const keys = Object.keys(fields).filter(k => schema.includes(k) && k !== 'id');
        
        if (keys.length === 0) return this.findById(id);

        const sql = `UPDATE ${this.tableName} SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
        const params = [...keys.map(k => fields[k]), id.toString()];
        
        await db.execute(sql, params);
        return this.findById(id);
    }

    async findByIdAndDelete(id) {
        const deleted = await this.findById(id);
        if (!deleted) return null;
        await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id.toString()]);
        return deleted;
    }

    async countDocuments(query = {}) {
        let sql = `SELECT COUNT(*) as cnt FROM ${this.tableName}`;
        let params = [];
        const keys = Object.keys(query);
        if (keys.length > 0) {
            sql += ' WHERE ' + keys.map(k => `${k} = ?`).join(' AND ');
            params = Object.values(query);
        }
        const row = await db.getOne(sql, params);
        return row ? row.cnt : 0;
    }

    create(data) {
        const self = this;
        const schema = SCHEMAS[this.tableName];
        const cleanedData = sanitizer.clean(data);

        // Generate a clean text ID if not provided
        const instance = { 
            id: cleanedData._id || cleanedData.id || `rec_${crypto.randomUUID().replace(/-/g, '')}`,
            ...cleanedData,
            save: async function() {
                const keys = Object.keys(this).filter(k => schema.includes(k));
                const placeholders = keys.map(() => '?').join(', ');
                const sql = `INSERT OR REPLACE INTO ${self.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
                const params = keys.map(k => this[k]);
                
                await db.execute(sql, params);
                this._id = this.id;
                return this;
            }
        };
        return instance;
    }
}

/**
 * QueryResult: Handles chainable queries and relational loading (populate).
 */
class QueryResult {
    constructor(tableName, query) {
        this.tableName = tableName;
        this.query = query;
        this.data = null;
        this._populatePath = null;
    }

    async execute() {
        if (this.data) return this.data;

        let sql = `SELECT * FROM ${this.tableName}`;
        let params = [];
        const keys = Object.keys(this.query);
        if (keys.length > 0) {
            const conditions = [];
            keys.forEach(k => {
                const val = this.query[k];
                if (val && typeof val === 'object' && val.$ne !== undefined) {
                    if (val.$ne === null) {
                        conditions.push(`${k} IS NOT NULL`);
                    } else {
                        conditions.push(`${k} != ?`);
                        params.push(val.$ne);
                    }
                } else {
                    if (val === null) {
                        conditions.push(`${k} IS NULL`);
                    } else {
                        conditions.push(`${k} = ?`);
                        params.push(val);
                    }
                }
            });
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        const rows = await db.query(sql, params);
        this.data = rows.map(r => ({ ...r, _id: r.id }));

        if (this._populatePath) {
            for (let item of this.data) {
                const path = this._populatePath;
                const val = item[path];
                if (path === 'assignedAssets' && this.tableName === 'employees') {
                    const assets = await db.query('SELECT * FROM assets WHERE assignedTo = ?', [item.id]);
                    item[path] = assets.map(a => ({ ...a, _id: a.id }));
                } else if (path === 'assignedTo' && this.tableName === 'assets') {
                    if (val) {
                        const emp = await db.getOne('SELECT * FROM employees WHERE id = ?', [val]);
                        item[path] = emp ? { ...emp, _id: emp.id } : val;
                    }
                } else if (path === 'employeeId' && this.tableName === 'managers') {
                    if (val) {
                        const emp = await db.getOne('SELECT * FROM employees WHERE id = ?', [val]);
                        item.employee = emp ? { ...emp, _id: emp.id } : null;
                    }
                }
            }
        }
        return this.data;
    }

    populate(path) {
        this._populatePath = path;
        return this;
    }

    // Await support
    async then(resolve, reject) {
        try {
            const data = await this.execute();
            return resolve(data);
        } catch (err) {
            if (reject) return reject(err);
            throw err;
        }
    }
}

// --- Initializing Singletons ---
const UserModel = new BaseModel('users');
const EmployeeModel = new BaseModel('employees');
const AssetModel = new BaseModel('assets');
const DepartmentModel = new BaseModel('departments');
const CategoryModel = new BaseModel('categories');
const ManagerModel = new BaseModel('managers');
const AuditLogModel = new BaseModel('audit_log');
const AssetAssignmentModel = new BaseModel('asset_assignments');

// --- Exporting Mongoose-compatible API for Seamless Integration ---
const User = function(data) { return UserModel.create(data); };
User.findOne = UserModel.findOne.bind(UserModel);
User.findById = UserModel.findById.bind(UserModel);
User.find = UserModel.find.bind(UserModel);
User.countDocuments = UserModel.countDocuments.bind(UserModel);

const Employee = function(data) { return EmployeeModel.create(data); };
Employee.find = EmployeeModel.find.bind(EmployeeModel);
Employee.findById = EmployeeModel.findById.bind(EmployeeModel);
Employee.findOne = EmployeeModel.findOne.bind(EmployeeModel);
Employee.findByIdAndUpdate = EmployeeModel.findByIdAndUpdate.bind(EmployeeModel);
Employee.findByIdAndDelete = EmployeeModel.findByIdAndDelete.bind(EmployeeModel);
Employee.countDocuments = EmployeeModel.countDocuments.bind(EmployeeModel);
Employee.generateNextEmployeeId = async () => {
    const row = await db.getOne(`SELECT id FROM employees WHERE id LIKE 'EMP-%' ORDER BY id DESC LIMIT 1`);
    if (!row) return 'EMP-00001';
    const lastNum = parseInt(row.id.split('-')[1]);
    return `EMP-${(lastNum + 1).toString().padStart(5, '0')}`;
};

const Asset = function(data) { return AssetModel.create(data); };
Asset.find = AssetModel.find.bind(AssetModel);
Asset.findById = AssetModel.findById.bind(AssetModel);
Asset.findOne = AssetModel.findOne.bind(AssetModel);
Asset.findByIdAndUpdate = AssetModel.findByIdAndUpdate.bind(AssetModel);
Asset.findByIdAndDelete = AssetModel.findByIdAndDelete.bind(AssetModel);
Asset.countDocuments = AssetModel.countDocuments.bind(AssetModel);
Asset.generateNextAssetId = async (category) => {
    const categoryPrefixMap = {
        'LAPTOP': 'LAP',
        'MOBILE': 'MOB',
        'NETWORK': 'NET',
        'PERIPHERAL': 'PER'
    };
    const prefix = categoryPrefixMap[category?.toUpperCase()] || 'AST';
    
    // Find all IDs with the prefix to extract the highest numeric part
    const row = await db.getOne(`SELECT assetId FROM assets WHERE assetId LIKE '${prefix}-%' ORDER BY assetId DESC LIMIT 1`);
    if (!row) return `${prefix}-00001`;
    
    const parts = row.assetId.split('-');
    const lastPart = parts[parts.length - 1]; // Take the last part (e.g. 00001 from LAP-00001 or AST-2024-001)
    const lastNum = parseInt(lastPart);
    
    if (isNaN(lastNum)) return `${prefix}-00001`; // Fallback if last part is not a number
    
    return `${prefix}-${(lastNum + 1).toString().padStart(5, '0')}`;
};

const Department = function(data) { return DepartmentModel.create(data); };
Department.find = DepartmentModel.find.bind(DepartmentModel);
Department.findById = DepartmentModel.findById.bind(DepartmentModel);
Department.findOne = DepartmentModel.findOne.bind(DepartmentModel);
Department.findByIdAndUpdate = DepartmentModel.findByIdAndUpdate.bind(DepartmentModel);
Department.findByIdAndDelete = DepartmentModel.findByIdAndDelete.bind(DepartmentModel);
Department.countDocuments = DepartmentModel.countDocuments.bind(DepartmentModel);

const Category = function(data) { return CategoryModel.create(data); };
Category.find = CategoryModel.find.bind(CategoryModel);
Category.findById = CategoryModel.findById.bind(CategoryModel);
Category.findOne = CategoryModel.findOne.bind(CategoryModel);
Category.findByIdAndUpdate = CategoryModel.findByIdAndUpdate.bind(CategoryModel);
Category.findByIdAndDelete = CategoryModel.findByIdAndDelete.bind(CategoryModel);
Category.countDocuments = CategoryModel.countDocuments.bind(CategoryModel);

const Manager = function(data) { return ManagerModel.create(data); };
Manager.find = ManagerModel.find.bind(ManagerModel);
Manager.findById = ManagerModel.findById.bind(ManagerModel);
Manager.findOne = ManagerModel.findOne.bind(ManagerModel);
Manager.findByIdAndUpdate = ManagerModel.findByIdAndUpdate.bind(ManagerModel);
Manager.findByIdAndDelete = ManagerModel.findByIdAndDelete.bind(ManagerModel);
Manager.countDocuments = ManagerModel.countDocuments.bind(ManagerModel);

const AuditLog = function(data) { return AuditLogModel.create(data); };
AuditLog.find = AuditLogModel.find.bind(AuditLogModel);
AuditLog.findById = AuditLogModel.findById.bind(AuditLogModel);
AuditLog.countDocuments = AuditLogModel.countDocuments.bind(AuditLogModel);
AuditLog.log = async (action, entityType, entityId, userId, details) => {
    try {
        const entry = AuditLogModel.create({
            action,
            entityType,
            entityId: entityId || '',
            userId: userId || 'system',
            details: details || ''
        });
        return await entry.save();
    } catch (err) {
        console.error('[AuditLog Error]', err.message);
        return null;
    }
};

const AssetAssignment = function(data) { return AssetAssignmentModel.create(data); };
AssetAssignment.find = AssetAssignmentModel.find.bind(AssetAssignmentModel);
AssetAssignment.findById = AssetAssignmentModel.findById.bind(AssetAssignmentModel);
AssetAssignment.findOne = AssetAssignmentModel.findOne.bind(AssetAssignmentModel);
AssetAssignment.findByIdAndUpdate = AssetAssignmentModel.findByIdAndUpdate.bind(AssetAssignmentModel);
AssetAssignment.findByIdAndDelete = AssetAssignmentModel.findByIdAndDelete.bind(AssetAssignmentModel);
AssetAssignment.countDocuments = AssetAssignmentModel.countDocuments.bind(AssetAssignmentModel);

module.exports = { 
    User, Employee, Asset, Department, Category, Manager, AuditLog, AssetAssignment 
};
