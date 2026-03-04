const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const { upload } = require('../config/cloudinary');

// Get all members
router.get('/', async (req, res) => {
    try {
        const query = { tenantId: req.tenantId || null };
        const members = await Member.find(query).sort({ fullName: 1 });
        res.json(members);
    } catch (err) {
        console.error('Error in GET /members:', err);
        res.status(500).json({ message: err.message });
    }
});

// Helper to apply 3x2 logic for family heads
const applyFamilyDiscount = async (familyHeadId, tenantId) => {
    if (!familyHeadId) return;
    try {
        const head = await Member.findById(familyHeadId);
        if (!head || !head.isFamilyHead) return;

        // Get active dependents
        const dependents = await Member.find({ familyId: familyHeadId, active: true });
        const totalActiveMembers = dependents.length + (head.active ? 1 : 0);

        if (totalActiveMembers === 0) return;

        // Fetch settings to get the base cost of the family plan
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne({ tenantId });

        let planCost = head.planCost;
        if (settings && settings.plans) {
            const familyPlan = settings.plans.find(p => p.name === head.planType);
            if (familyPlan) {
                planCost = familyPlan.cost;
            }
        }

        // 3x2 Calculation: Every 3rd member is free
        const billableMembers = totalActiveMembers - Math.floor(totalActiveMembers / 3);
        const totalCost = billableMembers * planCost;

        await Member.findByIdAndUpdate(familyHeadId, { planCost: totalCost });
    } catch (err) {
        console.error("Error applying family discount:", err);
    }
};

const parseFamilyFields = (body) => {
    return {
        isFamilyHead: body.isFamilyHead === 'true' || body.isFamilyHead === true,
        familyId: (body.familyId && body.familyId !== 'null' && body.familyId !== 'undefined' && body.familyId.trim() !== '') ? body.familyId : null
    };
};

// Add member
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const familyFields = parseFamilyFields(req.body);
        const memberData = {
            ci: req.body.ci,
            fullName: req.body.fullName,
            phone: req.body.phone,
            planType: req.body.planType,
            planCost: Number(req.body.planCost),
            birthDate: req.body.birthDate,
            comments: req.body.comments,
            active: req.body.active === 'true' || req.body.active === true,
            isExempt: req.body.isExempt === 'true' || req.body.isExempt === true,
            isInWhatsappGroup: req.body.isInWhatsappGroup === 'true' || req.body.isInWhatsappGroup === true,
            ...familyFields
        };

        if (req.file) {
            memberData.photoUrl = req.file.path;
        }

        if (req.tenantId) {
            memberData.tenantId = req.tenantId;
        }

        const member = new Member(memberData);
        const newMember = await member.save();

        if (familyFields.familyId) {
            await applyFamilyDiscount(familyFields.familyId, req.tenantId);
        } else if (familyFields.isFamilyHead) {
            await applyFamilyDiscount(newMember._id, req.tenantId);
        }

        res.status(201).json(newMember);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Bulk update members' plan
router.put('/bulk/plan', async (req, res) => {
    try {
        const { memberIds, planType, planCost } = req.body;
        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: 'No se seleccionaron socios válidos' });
        }

        const query = { _id: { $in: memberIds } };
        if (req.tenantId) {
            query.tenantId = req.tenantId;
        }

        await Member.updateMany(
            query,
            { $set: { planType, planCost: Number(planCost), isFamilyHead: false, familyId: null } }
        );
        res.json({ message: 'Socios actualizados correctamente' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update member
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const existingMember = await Member.findById(req.params.id);
        const oldFamilyId = existingMember ? existingMember.familyId : null;
        const wasFamilyHead = existingMember ? existingMember.isFamilyHead : false;

        const familyFields = parseFamilyFields(req.body);
        const memberData = {
            fullName: req.body.fullName,
            phone: req.body.phone,
            planType: req.body.planType,
            planCost: Number(req.body.planCost),
            birthDate: req.body.birthDate,
            comments: req.body.comments,
            active: req.body.active === 'true' || req.body.active === true,
            isExempt: req.body.isExempt === 'true' || req.body.isExempt === true,
            isInWhatsappGroup: req.body.isInWhatsappGroup === 'true' || req.body.isInWhatsappGroup === true,
            ...familyFields
        };

        if (req.file) {
            memberData.photoUrl = req.file.path;
        }

        const updatedMember = await Member.findByIdAndUpdate(req.params.id, memberData, { new: true });

        // If this member stopped being a family head, unlink their dependents
        if (wasFamilyHead && !familyFields.isFamilyHead) {
            await Member.updateMany(
                { familyId: updatedMember._id },
                { $set: { familyId: null, planCost: 0, planType: 'Libre' } }
            );
        }

        // Update previous family head an new family head (or self if head)
        if (oldFamilyId && oldFamilyId.toString() !== (familyFields.familyId || '').toString()) {
            await applyFamilyDiscount(oldFamilyId, req.tenantId);
        }

        if (familyFields.familyId) {
            await applyFamilyDiscount(familyFields.familyId, req.tenantId);
        } else if (familyFields.isFamilyHead) {
            // Need to apply discount so it overwrites whatever planCost the frontend sent
            // to ensure 3x2 logic stays intact right after updating the head!
            await applyFamilyDiscount(updatedMember._id, req.tenantId);

            // Re-fetch to return the updated price calculation to the frontend
            const refreshedMember = await Member.findById(updatedMember._id);
            return res.json(refreshedMember);
        }

        res.json(updatedMember);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete member
router.delete('/:id', async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        const familyIdToRecalculate = member ? member.familyId : null;

        // If this member is a head, maybe unassign its dependents or delete them?
        // Right now, if head is deleted, dependents stay stranded. Let's unassign them.
        if (member && member.isFamilyHead) {
            await Member.updateMany({ familyId: member._id }, { $set: { familyId: null, planCost: 0, planType: 'Libre' } });
        }

        await Member.findByIdAndDelete(req.params.id);

        if (familyIdToRecalculate) {
            await applyFamilyDiscount(familyIdToRecalculate, req.tenantId);
        }

        res.json({ message: 'Member deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
