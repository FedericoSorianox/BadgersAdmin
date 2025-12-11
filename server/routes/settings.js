const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// Get Settings
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne({ key: 'admin_config' });
        if (!settings) {
            // Create default if not exists
            settings = new Settings({
                fedeHours: 40,
                gonzaHours: 8,
                fedeDaysOff: 0,
                gonzaDaysOff: 0,
                instructors: [
                    { name: 'Guille', hours: 8 },
                    { name: 'Uiller', hours: 4 }
                ]
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Settings
router.post('/', async (req, res) => {
    try {
        const { fedeHours, gonzaHours, fedeDaysOff, gonzaDaysOff, instructors } = req.body;

        let settings = await Settings.findOne({ key: 'admin_config' });
        if (!settings) {
            settings = new Settings({ key: 'admin_config' });
        }

        settings.fedeHours = fedeHours;
        settings.gonzaHours = gonzaHours;
        settings.fedeDaysOff = fedeDaysOff;
        settings.gonzaDaysOff = gonzaDaysOff;
        settings.instructors = instructors;

        const updatedSettings = await settings.save();
        res.json(updatedSettings);

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
