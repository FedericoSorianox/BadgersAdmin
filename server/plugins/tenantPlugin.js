const mongoose = require('mongoose');
const { tenantStorage } = require('../utils/tenantContext');

module.exports = function tenantPlugin(schema) {
    // Add tenantId field
    schema.add({
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: false, // Relaxed for legacy data compatibility
            index: true
        }
    });

    // Compound index for efficiency (optimizes queries that filter by tenantId)
    // Note: Mongoose might warn if indexes are created multiple times or conflict, 
    // but this is standard for new schema definition.
    schema.index({ tenantId: 1, _id: 1 });

    // Middleware to inject tenantId on Find
    const injectTenant = async function (next) {
        try {
            const store = tenantStorage.getStore();
            const tenantId = store ? store.get('tenantId') : null;

            if (tenantId) {
                this.where({ tenantId });
            }

            // Support both callback and promise styles just in case
            if (typeof next === 'function') {
                next();
            }
        } catch (error) {
            console.error('TenantPlugin Error:', error);
            if (typeof next === 'function') {
                next(error);
            } else {
                throw error;
            }
        }
    };

    schema.pre('find', injectTenant);
    schema.pre('findOne', injectTenant);
    schema.pre('countDocuments', injectTenant);
    schema.pre('findOneAndUpdate', injectTenant);
    schema.pre('updateMany', injectTenant);
    schema.pre('deleteOne', injectTenant);
    schema.pre('deleteMany', injectTenant);

    // Middleware to inject tenantId on Save
    schema.pre('save', function () {
        const store = tenantStorage.getStore();
        const tenantId = store ? store.get('tenantId') : null;

        if (tenantId && !this.tenantId) {
            this.tenantId = tenantId;
        }
    });
};
