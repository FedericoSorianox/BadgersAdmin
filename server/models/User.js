const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed
    role: { type: String, enum: ['superadmin', 'admin', 'staff'], default: 'admin' },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }, // Null for superadmin
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
