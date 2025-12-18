const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // e.g., 'gyma', 'gymb'
    branding: {
        primaryColor: { type: String, default: '#3498db' },
        secondaryColor: { type: String, default: '#2c3e50' },
        logoUrl: { type: String }, // General logo
        sidebarLogoUrl: { type: String }, // Specific sidebar image if different
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
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tenant', TenantSchema);
