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
    // Regional configuration per academy
    locale: {
        country:      { type: String, default: 'UY' },           // ISO 3166-1 alpha-2
        currency:     { type: String, default: 'UYU' },          // ISO 4217
        currencySymbol: { type: String, default: '$' },
        locale:       { type: String, default: 'es-UY' },        // BCP 47 locale tag
        timezone:     { type: String, default: 'America/Montevideo' },
        phonePrefix:  { type: String, default: '598' }           // Default phone country code
    },
    // Notification / messaging configuration
    notifications: {
        webhookUrl:   { type: String, default: '' },              // N8N or custom webhook URL
        // Configurable WhatsApp message templates with {name}, {link}, {amount} placeholders
        paymentReminderTemplate: {
            type: String,
            default: 'Hola {name}, te recordamos que tenés pendiente de pago tu cuota mensual o consumos. Te solicitamos amablemente ponerte al día. Podés consultar el estado de tu cuenta aquí: {link}'
        },
        fiadoReminderTemplate: {
            type: String,
            default: 'Hola {name}, te recordamos que tenés consumos pendientes de pago. Podés consultar el detalle aquí: {link}'
        }
    },
    partners: [{
        name: { type: String, default: '' },
        percentage: { type: Number, default: 0 }
    }],
    instructorHourlyRate: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },             // Alert when product stock <= this
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tenant', TenantSchema);

