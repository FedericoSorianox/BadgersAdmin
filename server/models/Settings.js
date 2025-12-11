const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    key: { type: String, default: 'admin_config', unique: true },
    fedeHours: { type: Number, default: 40 },
    gonzaHours: { type: Number, default: 8 },
    fedeDaysOff: { type: Number, default: 0 },
    gonzaDaysOff: { type: Number, default: 0 },
    instructors: [{
        name: String,
        hours: { type: Number, default: 0 }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
