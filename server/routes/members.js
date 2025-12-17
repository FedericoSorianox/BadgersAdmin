const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const { upload } = require('../config/cloudinary');

// Get all members
router.get('/', async (req, res) => {
    try {
        const members = await Member.find().sort({ fullName: 1 });
        res.json(members);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add member
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const memberData = {
            ci: req.body.ci,
            fullName: req.body.fullName,
            phone: req.body.phone,
            planType: req.body.planType,
            planCost: Number(req.body.planCost),
            birthDate: req.body.birthDate,
            comments: req.body.comments,
            active: req.body.active === 'true' || req.body.active === true
        };

        // If an image was uploaded, save its path
        if (req.file) {
            memberData.photoUrl = req.file.path;
        }

        const member = new Member(memberData);
        const newMember = await member.save();
        res.status(201).json(newMember);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update member
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const memberData = {
            fullName: req.body.fullName,
            phone: req.body.phone,
            planType: req.body.planType,
            planCost: Number(req.body.planCost),
            birthDate: req.body.birthDate,
            comments: req.body.comments,
            active: req.body.active === 'true' || req.body.active === true
        };

        // If a new image was uploaded, update the path
        if (req.file) {
            memberData.photoUrl = req.file.path;
        }

        const updatedMember = await Member.findByIdAndUpdate(req.params.id, memberData, { new: true });
        res.json(updatedMember);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete member
router.delete('/:id', async (req, res) => {
    try {
        await Member.findByIdAndDelete(req.params.id);
        res.json({ message: 'Member deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
