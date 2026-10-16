const express = require('express');
const router  = express.Router();
const Settings = require('../models/Settings');
const Tenant = require('../models/Tenant');
const auth = require('../middleware/auth');

// Protect all settings routes
router.use(auth);

/* ─── helpers ─────────────────────────────────────────────────────────────── */

/**
 * Returns Monday 00:00:00 UTC of the week containing `date`.
 */
function getWeekStart(date = new Date()) {
    const d  = new Date(date);
    const day = d.getUTCDay(); // 0 Sun … 6 Sat
    const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Returns the 1st 00:00:00 UTC of the current month.
 */
function getMonthStart(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Given a task document, decide if its completion should be cleared
 * because a new period has started since it was completed.
 */
function isStale(task) {
    if (!task.completedAt) return false;
    const completed = new Date(task.completedAt);

    if (task.frequency === 'weekly') {
        return completed < getWeekStart();
    }
    if (task.frequency === 'monthly') {
        return completed < getMonthStart();
    }
    return false;
}

/* ─── GET /api/settings ─────────────────────────────────────────────────── */
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne({ key: 'admin_config' });

        if (!settings) {
            let initialPartners = [];
            if (req.tenantId) {
                const tenant = await Tenant.findById(req.tenantId);
                if (tenant && tenant.partners && tenant.partners.length > 0) {
                    initialPartners = tenant.partners.map(p => ({
                        name: p.name,
                        percentage: Number(p.percentage) || 0,
                        hours: 0,
                        daysOff: 0
                    }));
                }
            }
            // Seed defaults on first run — use dynamic partners array
            settings = new Settings({
                key: 'admin_config',
                tenantId: req.tenantId || null,
                partners: initialPartners,
                partnerHourlyRate: 1000,
                instructors: [],
                instructorHourlyRate: 500,
                savingsPercentage: 10,
                tasks: []
            });
            await settings.save();
        } else if (settings.partners.length === 0 && req.tenantId) {
            const tenant = await Tenant.findById(req.tenantId);
            if (tenant && tenant.partners && tenant.partners.length > 0) {
                settings.partners = tenant.partners.map(p => ({
                    name: p.name,
                    percentage: Number(p.percentage) || 0,
                    hours: 0,
                    daysOff: 0
                }));
                await settings.save();
            }
        }

        // Auto-migrate legacy fields to dynamic partners array (one-time, for main gym)
        if (!req.tenantId && settings.partners.length === 0 && (settings.fedeHours != null || settings.gonzaHours != null)) {
            const legacyPartners = [];
            if (settings.fedeHours != null) {
                legacyPartners.push({ name: 'Fede', percentage: 70, hours: settings.fedeHours || 0, daysOff: settings.fedeDaysOff || 0 });
            }
            if (settings.gonzaHours != null) {
                legacyPartners.push({ name: 'Gonza / Andy', percentage: 30, hours: settings.gonzaHours || 0, daysOff: settings.gonzaDaysOff || 0 });
            }
            if (legacyPartners.length > 0) {
                settings.partners = legacyPartners;
                await settings.save();
            }
        } else if (!req.tenantId && settings.partners.length > 0) {
            let needsSave = false;
            settings.partners.forEach(p => {
                if (p.percentage === undefined || p.percentage === null) {
                    if (/fede/i.test(p.name)) p.percentage = 70;
                    else if (/gonza|andy/i.test(p.name)) p.percentage = 30;
                    else p.percentage = 50;
                    needsSave = true;
                }
                if (/^gonza$/i.test(p.name.trim())) {
                    p.name = 'Gonza / Andy';
                    needsSave = true;
                }
            });
            if (needsSave) await settings.save();
        }

        // Auto-reset stale completions server-side before returning
        let mutated = false;
        settings.tasks.forEach(task => {
            if (isStale(task)) {
                task.completedAt = null;
                mutated = true;
            }
        });
        if (mutated) await settings.save();

        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ─── POST /api/settings ─────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
    try {
        const {
            partners, partnerHourlyRate,
            instructors, instructorHourlyRate,
            plans, tasks,
            academySavingsBox, savingsPercentage,
            // Legacy fields accepted for backward compatibility
            fedeHours, gonzaHours, fedeDaysOff, gonzaDaysOff
        } = req.body;

        let settings = await Settings.findOne({ key: 'admin_config' });
        if (!settings) settings = new Settings({ key: 'admin_config' });

        // Prefer new partners array; fall back to legacy fields
        if (partners !== undefined) {
            settings.partners = partners.map(p => ({
                name: p.name,
                percentage: p.percentage !== undefined && p.percentage !== null
                    ? Number(p.percentage)
                    : (/fede/i.test(p.name) ? 70 : (/gonza|andy/i.test(p.name) ? 30 : 50)),
                hours: Number(p.hours) || 0,
                daysOff: Number(p.daysOff) || 0
            }));
        } else if (fedeHours !== undefined || gonzaHours !== undefined) {
            // Legacy compatibility: convert flat fields to partners array
            const p = settings.partners?.length ? [...settings.partners] : [];
            const updateOrAdd = (name, hours, daysOff) => {
                const idx = p.findIndex(x => x.name === name);
                if (idx >= 0) {
                    if (hours !== undefined) p[idx].hours = hours;
                    if (daysOff !== undefined) p[idx].daysOff = daysOff;
                } else {
                    p.push({ name, hours: hours || 0, daysOff: daysOff || 0 });
                }
            };
            if (fedeHours !== undefined || fedeDaysOff !== undefined) updateOrAdd('Fede', fedeHours, fedeDaysOff);
            if (gonzaHours !== undefined || gonzaDaysOff !== undefined) updateOrAdd('Gonza', gonzaHours, gonzaDaysOff);
            settings.partners = p;
            // Also save to legacy fields for any external consumers
            if (fedeHours !== undefined) settings.fedeHours = fedeHours;
            if (gonzaHours !== undefined) settings.gonzaHours = gonzaHours;
            if (fedeDaysOff !== undefined) settings.fedeDaysOff = fedeDaysOff;
            if (gonzaDaysOff !== undefined) settings.gonzaDaysOff = gonzaDaysOff;
        }

        if (partnerHourlyRate    !== undefined) settings.partnerHourlyRate    = partnerHourlyRate;
        if (instructors          !== undefined) settings.instructors          = instructors;
        if (instructorHourlyRate !== undefined) settings.instructorHourlyRate = instructorHourlyRate;
        if (plans                !== undefined) settings.plans                = plans;
        if (tasks                !== undefined) settings.tasks                = tasks;
        if (academySavingsBox    !== undefined) settings.academySavingsBox    = academySavingsBox;
        if (savingsPercentage    !== undefined) settings.savingsPercentage    = savingsPercentage;

        const updated = await settings.save();
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

/* ─── PATCH /api/settings/tasks/:taskId/toggle ───────────────────────────── */
// Toggle a single task's completed state without sending the full document.
router.patch('/tasks/:taskId/toggle', async (req, res) => {
    try {
        let settings = await Settings.findOne({ key: 'admin_config' });
        if (!settings) return res.status(404).json({ message: 'Settings not found' });

        const task = settings.tasks.id(req.params.taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // If currently completed AND not stale, unmark it; otherwise mark it done now
        if (task.completedAt && !isStale(task)) {
            task.completedAt = null;
        } else {
            task.completedAt = new Date();
        }

        await settings.save();
        res.json({ task, tasks: settings.tasks });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


/* ─── PUT /api/settings/tasks ─────────────────────────────────────────────── */
// Replace the full tasks array (used when adding a new task).
router.put('/tasks', async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!Array.isArray(tasks)) {
            return res.status(400).json({ message: 'tasks must be an array' });
        }

        let settings = await Settings.findOne({ key: 'admin_config' });
        if (!settings) return res.status(404).json({ message: 'Settings not found' });

        settings.tasks = tasks;
        await settings.save();
        res.json({ tasks: settings.tasks });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ─── DELETE /api/settings/tasks/:taskId ─────────────────────────────────── */
router.delete('/tasks/:taskId', async (req, res) => {
    try {
        let settings = await Settings.findOne({ key: 'admin_config' });
        if (!settings) return res.status(404).json({ message: 'Settings not found' });

        const before = settings.tasks.length;
        settings.tasks = settings.tasks.filter(t => String(t._id) !== req.params.taskId);

        if (settings.tasks.length === before) {
            return res.status(404).json({ message: 'Task not found' });
        }

        await settings.save();
        res.json({ tasks: settings.tasks });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
