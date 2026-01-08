const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@example.com' });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists');
            return;
        }

        // Create admin user
        const admin = new User({
            fullName: 'System Administrator',
            region: 'Head Office',
            contactNo: '9999999999',
            email: 'admin@example.com',
            password: 'Admin@123',
            role: 'sysadmin',
            activeStatus: true
        });

        await admin.save();
        console.log('✅ Admin user created successfully');
        console.log('📧 Email: admin@example.com');
        console.log('🔑 Password: Admin@123');
        console.log('⚠️  Please change the password after first login!');

    } catch (error) {
        console.error('❌ Error seeding admin:', error.message);
    }
};

// If running directly
if (require.main === module) {
    const connectDB = require('../config/database');
    connectDB().then(() => {
        seedAdmin().then(() => {
            process.exit(0);
        });
    });
}

module.exports = seedAdmin;
