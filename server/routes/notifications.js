const express = require('express');
const router = express.Router();
const axios = require('axios');
const Notification = require('../models/Notification');
const Tenant = require('../models/Tenant');
const auth = require('../middleware/auth');

// Protect all notification routes
router.use(auth);

/**
 * Resolve the webhook URL for the current tenant.
 * Priority: Tenant.notifications.webhookUrl > process.env.N8N_WEBHOOK_URL
 */
async function resolveWebhookUrl(tenantId) {
    if (tenantId) {
        try {
            const tenant = await Tenant.findById(tenantId).select('notifications.webhookUrl').lean();
            if (tenant?.notifications?.webhookUrl) {
                return tenant.notifications.webhookUrl;
            }
        } catch (err) {
            console.warn('Could not resolve tenant webhook URL, falling back to env:', err.message);
        }
    }
    return process.env.N8N_WEBHOOK_URL || null;
}

// POST /api/notifications/send-reminder
router.post('/send-reminder', async (req, res) => {
    const { phone, memberName, memberId, amount, type, link } = req.body;

    const isSimulated = process.env.NODE_ENV !== 'production' || process.env.DISABLE_NOTIFICATIONS === 'true';
    const webhookUrl = !isSimulated ? await resolveWebhookUrl(req.tenantId) : null;

    if (!isSimulated && !webhookUrl) {
        return res.status(500).json({ message: 'Webhook URL not configured. Set it in Tenant settings or N8N_WEBHOOK_URL env var.' });
    }

    try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Check if reminder already sent this month (Logged but not used to block)
        const existingNotification = await Notification.findOne({
            memberId: memberId,
            type: 'payment_reminder',
            month: currentMonth,
            year: currentYear,
            tenantId: req.tenantId || null
        });

        // Log if it was already sent, but PROCEED anyway as requested
        if (existingNotification) {
            console.log(`Resending reminder to ${memberName} (previously sent)`);
        }

        if (isSimulated) {
            console.log(`[SIMULATED NOTIFICATION] Sent to ${memberName} (${phone}) - Amount: ${amount}`);
        } else {
            await axios.post(webhookUrl, {
                phone,
                memberName,
                amount,
                type: type || 'payment_reminder',
                timestamp: new Date().toISOString(),
                link
            });
        }

        // Save notification log
        const notification = new Notification({
            memberId,
            type: 'payment_reminder',
            month: currentMonth,
            year: currentYear,
            tenantId: req.tenantId || null
        });
        await notification.save();

        res.json({ success: true, message: isSimulated ? 'Simulated reminder logged' : 'Reminder sent successfully' });
    } catch (error) {
        console.error('Error sending reminder to webhook:', error.message);
        res.status(500).json({ message: 'Failed to send reminder' });
    }
});

// POST /api/notifications/send-fiado-reminder
// Server-side proxy for fiado reminders (replaces direct client→N8N calls)
router.post('/send-fiado-reminder', async (req, res) => {
    const { phone, memberName, memberId, message, link } = req.body;

    const isSimulated = process.env.NODE_ENV !== 'production' || process.env.DISABLE_NOTIFICATIONS === 'true';
    const webhookUrl = !isSimulated ? await resolveWebhookUrl(req.tenantId) : null;

    if (!isSimulated && !webhookUrl) {
        return res.status(500).json({ message: 'Webhook URL not configured. Set it in Tenant settings or N8N_WEBHOOK_URL env var.' });
    }

    try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        if (isSimulated) {
            console.log(`[SIMULATED FIADO REMINDER] Sent to ${memberName} (${phone})`);
        } else {
            await axios.post(webhookUrl, {
                phone,
                memberName,
                type: 'fiado',
                message,
                link,
                timestamp: new Date().toISOString()
            });
        }

        // Log notification (idempotent per month)
        const existing = await Notification.findOne({
            memberId,
            type: 'fiado_reminder',
            month: currentMonth,
            year: currentYear,
            tenantId: req.tenantId || null
        });

        if (!existing) {
            const notification = new Notification({
                memberId,
                type: 'fiado_reminder',
                month: currentMonth,
                year: currentYear,
                tenantId: req.tenantId || null
            });
            await notification.save();
        }

        res.json({ success: true, message: isSimulated ? 'Simulated fiado reminder logged' : 'Fiado reminder sent' });
    } catch (error) {
        console.error('Error sending fiado reminder to webhook:', error.message);
        res.status(500).json({ message: 'Failed to send fiado reminder' });
    }
});

// GET /api/notifications/reminders
// Get all reminders sent for the current month
router.get('/reminders', async (req, res) => {
    try {
        const { type } = req.query;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const reminders = await Notification.find({
            type: type || 'payment_reminder',
            month: currentMonth,
            year: currentYear,
            tenantId: req.tenantId || null
        });

        // Return list of memberIds who received a reminder
        const remindedMemberIds = reminders.map(r => r.memberId);
        res.json(remindedMemberIds);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/notifications/log-reminder
router.post('/log-reminder', async (req, res) => {
    const { memberId, type } = req.body;
    const notificationType = type || 'payment_reminder';
    try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const existing = await Notification.findOne({
            memberId,
            type: notificationType,
            month: currentMonth,
            year: currentYear,
            tenantId: req.tenantId || null
        });

        if (!existing) {
            const notification = new Notification({
                memberId,
                type: notificationType,
                month: currentMonth,
                year: currentYear,
                tenantId: req.tenantId || null
            });
            await notification.save();
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/notifications/send-reminders-bulk
router.post('/send-reminders-bulk', async (req, res) => {
    const { members } = req.body; // Expects array of { phone, name, id, amount, link, message }

    const isSimulated = process.env.NODE_ENV !== 'production' || process.env.DISABLE_NOTIFICATIONS === 'true';
    const webhookUrl = !isSimulated ? await resolveWebhookUrl(req.tenantId) : null;

    if (!isSimulated && !webhookUrl) {
        return res.status(500).json({ message: 'Webhook URL not configured. Set it in Tenant settings or N8N_WEBHOOK_URL env var.' });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ message: 'No members provided' });
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const results = { success: 0, failed: 0 };

    // Process sequentially to avoid overwhelming webhook or rate limits
    for (const member of members) {
        try {
            if (isSimulated) {
                console.log(`[SIMULATED BULK NOTIFICATION] Sent to ${member.name} (${member.phone}) - Amount: ${member.amount}`);
            } else {
                await axios.post(webhookUrl, {
                    phone: member.phone,
                    memberName: member.name,
                    amount: member.amount,
                    type: 'payment_reminder',
                    timestamp: new Date().toISOString(),
                    link: member.link,
                    message: member.message
                });
            }

            // Save notification log
            const notification = new Notification({
                memberId: member.id,
                type: 'payment_reminder',
                month: currentMonth,
                year: currentYear,
                tenantId: req.tenantId || null
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

