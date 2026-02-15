const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    ci: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    phone: { type: String },
    emergencyContact: {
        name: { type: String },
        phone: { type: String }
    },
    birthDate: { type: Date },
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
    createdAt: { type: Date, default: Date.now }
});

MemberSchema.plugin(require('../plugins/tenantPlugin'));

module.exports = mongoose.model('Member', MemberSchema);
