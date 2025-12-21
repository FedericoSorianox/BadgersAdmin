const express = require('express');
const router = express.Router();
const axios = require('axios');
const Notification = require('../models/Notification');

// POST /api/notifications/send-reminder
router.post('/send-reminder', async (req, res) => {
    const { phone, memberName, memberId, amount, type } = req.body;

    if (!process.env.N8N_WEBHOOK_URL) {
        return res.status(500).json({ message: 'N8N_WEBHOOK_URL not configured' });
    }

    try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Check if reminder already sent this month (Logged but not used to block)
        const existingNotification = await Notification.findOne({
            memberId: memberId,
            type: 'payment_reminder',
            month: currentMonth,
            year: currentYear
        });

        // Log if it was already sent, but PROCEED anyway as requested
        if (existingNotification) {
            console.log(`Resending reminder to ${memberName} (previously sent)`);
        }

        await axios.post(process.env.N8N_WEBHOOK_URL, {
            phone,
            memberName,
            amount,
            type: type || 'payment_reminder',
            timestamp: new Date().toISOString()
        });

        // Save notification log
        const notification = new Notification({
            memberId,
            type: 'payment_reminder',
            month: currentMonth,
            year: currentYear
        });
        await notification.save();

        res.json({ success: true, message: 'Reminder sent successfully' });
    } catch (error) {
        console.error('Error sending reminder to n8n:', error.message);
        res.status(500).json({ message: 'Failed to send reminder' });
    }
});

// GET /api/notifications/reminders
// Get all reminders sent for the current month
router.get('/reminders', async (req, res) => {
    try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const reminders = await Notification.find({
            type: 'payment_reminder',
            month: currentMonth,
            year: currentYear
        });

        // Return list of memberIds who received a reminder
        const remindedMemberIds = reminders.map(r => r.memberId);
        res.json(remindedMemberIds);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/notifications/send-reminders-bulk
router.post('/send-reminders-bulk', async (req, res) => {
    const { members } = req.body; // Expects array of { phone, name, id, amount }

    if (!process.env.N8N_WEBHOOK_URL) {
        return res.status(500).json({ message: 'N8N_WEBHOOK_URL not configured' });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ message: 'No members provided' });
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const results = { success: 0, failed: 0 };

    // Process sequentially to avoid overwhelming n8n or rate limits
    for (const member of members) {
        try {
            await axios.post(process.env.N8N_WEBHOOK_URL, {
                phone: member.phone,
                memberName: member.name,
                amount: member.amount,
                type: 'payment_reminder',
                timestamp: new Date().toISOString()
            });

            // Save notification log
            const notification = new Notification({
                memberId: member.id,
                type: 'payment_reminder',
                month: currentMonth,
                year: currentYear
            });
            await notification.save();
            results.success++;
        } catch (error) {
            console.error(`Error sending bulk reminder to ${member.name}:`, error.message);
            results.failed++;
        }
    }

    res.json({
        success: true,
        message: `Reminders processed. Success: ${results.success}, Failed: ${results.failed}`,
        details: results
    });
});

module.exports = router;
