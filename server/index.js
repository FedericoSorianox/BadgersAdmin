require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('Martial Arts Admin API');
});

// Routes placeholders
app.use('/api/members', require('./routes/members'));
app.use('/api/products', require('./routes/products'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
