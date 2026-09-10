const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true }, // Uniqueness enforced per-tenant via compound index below
    password: { type: String, required: true }, // Hashed
    role: { type: String, enum: ['superadmin', 'admin', 'staff'], default: 'admin' },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }, // Null for superadmin
    createdAt: { type: Date, default: Date.now }
});

// Compound unique index: same username allowed across different academies
UserSchema.index({ tenantId: 1, username: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);
