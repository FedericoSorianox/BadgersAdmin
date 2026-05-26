const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    // 'weekly' resets every Monday, 'monthly' resets on the 1st of each month
    frequency:   { type: String, enum: ['weekly', 'monthly'], required: true },
    completedAt: { type: Date, default: null }   // null = pending
});

const settingsSchema = new mongoose.Schema({
    key:          { type: String, default: 'admin_config', unique: true },
    fedeHours:    { type: Number, default: 40 },
    gonzaHours:   { type: Number, default: 8 },
    fedeDaysOff:  { type: Number, default: 0 },
    gonzaDaysOff: { type: Number, default: 0 },
    instructors: [{
        name:  String,
        hours: { type: Number, default: 0 }
    }],
    plans: [{
        name: { type: String, required: true },
        cost: { type: Number, required: true },
        type: { type: String, enum: ['Individual', 'Familiar'], default: 'Individual' }
    }],
    academySavingsBox: { type: Number, default: 0 },
    tasks: [taskSchema]
}, { timestamps: true });

settingsSchema.plugin(require('../plugins/tenantPlugin'));

module.exports = mongoose.model('Settings', settingsSchema);
