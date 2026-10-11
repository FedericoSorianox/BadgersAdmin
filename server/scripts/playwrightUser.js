const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

// Cargar variables de entorno (modo development)
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const action = process.argv[2];
const username = process.argv[3] || 'playwright_test_admin';
const password = 'playwright_password123';

async function manageUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        if (action === 'create') {
            // Eliminar si existe por las dudas
            await User.deleteOne({ username });
            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            const user = new User({
                username,
                password: hashedPassword,
                role: 'admin'
            });
            await user.save();
            console.log(JSON.stringify({ username, password }));
        } else if (action === 'delete') {
            await User.deleteOne({ username });
            console.log(JSON.stringify({ success: true, message: 'User deleted' }));
        } else {
            console.error('Invalid action');
            process.exit(1);
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

manageUser();
