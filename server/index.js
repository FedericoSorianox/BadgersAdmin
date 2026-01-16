const path = require('path');
const dotenv = require('dotenv');

if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: path.resolve(__dirname, '.env.development') });
} else {
    dotenv.config();
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'https://badgersadminuy.netlify.app',
    'http://localhost:5173',
    'http://localhost:5001',
    'https://gymworkspro.com',
    'https://www.gymworkspro.com',
    'https://the-badgers.com',
    'https://www.the-badgers.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check against allowed exact matches
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // Check for subdomains of gymworkspro.com
        if (origin.endsWith('.gymworkspro.com') || origin.endsWith('.the-badgers.com')) {
            return callback(null, true);
        }

        // Also allow local development subdomains
        if (origin.includes('localhost:')) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('Martial Arts Admin API');
});

// TEMPORARY: Promote 'admin' to superadmin (Remove after use)
app.get('/fix-promote-admin', async (req, res) => {
    try {
        const User = require('./models/User');
        const user = await User.findOne({ username: 'admin' });
        if (!user) return res.send("User 'admin' not found.");

        user.role = 'superadmin';
        user.tenantId = null; // Global access
        await user.save();

        res.send("✅ Success! User 'admin' is now a Super Admin. You can login now.");
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// Routes placeholders
app.use(require('./middleware/tenant'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/images', require('./routes/images'));
app.use('/api/members', require('./routes/members'));
app.use('/api/products', require('./routes/products'));
app.use('/api/productos', require('./routes/products'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
