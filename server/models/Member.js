const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    ci: { type: String, required: true }, // Uniqueness enforced per-tenant via compound index below
    fullName: { type: String, required: true },
    phone: { type: String },
    emergencyContact: {
        name: { type: String },
        phone: { type: String }
    },
    birthDate: { type: Date },
    joinDate: { type: Date },
    planType: { type: String, default: 'Libre' },
    planCost: { type: Number, default: 2000 }, // Stored snapshot of cost
    active: { type: Boolean, default: true },
    isExempt: { type: Boolean, default: false },
    isInWhatsappGroup: { type: Boolean, default: false },
    photoUrl: { type: String },
    medicalInfo: { type: String },
    comments: { type: String },
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    isFamilyHead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    statusHistory: [{
        status: { type: Boolean, required: true },
        date: { type: Date, default: Date.now }
    }]
});

MemberSchema.plugin(require('../plugins/tenantPlugin'));

// Compound unique index: same document number allowed across different academies
MemberSchema.index({ tenantId: 1, ci: 1 }, { unique: true });

module.exports = mongoose.model('Member', MemberSchema);
