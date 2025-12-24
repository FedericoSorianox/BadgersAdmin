const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // e.g., 'gyma', 'gymb'
    branding: {
        primaryColor: { type: String, default: '#3498db' },
        secondaryColor: { type: String, default: '#2c3e50' },
        logoUrl: { type: String }, // General logo
        sidebarText: { type: String }, // Text to replace "Badgers Admin"
        textColor: { type: String, default: '#ffffff' }, // Text color for sidebar/primary actions
        menuHoverColor: { type: String }, // Color when hovering menu items
        menuActiveColor: { type: String }, // Color for active menu item
        dashboardTitleColor: { type: String }, // Specific color for dashboard titles
        newSaleButtonColor: { type: String },
        newExpenseButtonColor: { type: String },
        newFiadoButtonColor: { type: String },
        newMemberButtonColor: { type: String },
        newProductButtonColor: { type: String },
        saveButtonColor: { type: String }
    },
    partners: [{
        name: { type: String, default: '' },
        percentage: { type: Number, default: 0 }
    }],
    instructorHourlyRate: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tenant', TenantSchema);
