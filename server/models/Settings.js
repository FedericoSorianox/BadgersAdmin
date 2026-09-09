const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    // 'weekly' resets every Monday, 'monthly' resets on the 1st of each month, 'once'/'note' stays until manually deleted
    frequency:   { type: String, enum: ['weekly', 'monthly', 'once', 'note'], required: true },
    completedAt: { type: Date, default: null }   // null = pending
});

const settingsSchema = new mongoose.Schema({
    key:          { type: String, default: 'admin_config' }, // Uniqueness enforced per-tenant via compound index below

    // Dynamic partners for revenue distribution (replaces static fedeHours/gonzaHours)
    partners: [{
        name:     { type: String, required: true },
        hours:    { type: Number, default: 0 },    // Base monthly hours
        daysOff:  { type: Number, default: 0 }      // Days off this month (reduces effective hours)
    }],
    partnerHourlyRate: { type: Number, default: 1000 },  // $/hour for partner payment calculation

    // Legacy fields kept for backward compatibility with existing data
    // New academies should use the partners array instead
    fedeHours:    { type: Number },
    gonzaHours:   { type: Number },
    fedeDaysOff:  { type: Number },
    gonzaDaysOff: { type: Number },

    instructors: [{
        name:  String,
        hours: { type: Number, default: 0 }
    }],
    instructorHourlyRate: { type: Number, default: 500 }, // $/hour for external instructors

    plans: [{
        name: { type: String, required: true },
        cost: { type: Number, required: true },
        type: { type: String, enum: ['Individual', 'Familiar'], default: 'Individual' }
    }],
    academySavingsBox: { type: Number, default: 0 },
    savingsPercentage: { type: Number, default: 10 }, // % of gross profit reserved for savings
    tasks: [taskSchema]
}, { timestamps: true });

settingsSchema.plugin(require('../plugins/tenantPlugin'));

// Compound unique index: each tenant has exactly one config document per key
settingsSchema.index({ tenantId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Settings', settingsSchema);

