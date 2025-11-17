// One-time script to promote a user to superadmin
// Run with: node scripts/promote-to-superadmin.js

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard', path: '/admin' },
  { id: 'tickets', name: 'Tickets', path: '/admin/tickets' },
  { id: 'expenses', name: 'Expenses', path: '/admin/expenses' },
  { id: 'stations', name: 'Stations', path: '/admin/stations' },
  { id: 'equipment', name: 'Equipment', path: '/admin/equipment' },
  { id: 'users', name: 'User Management', path: '/admin/users' },
  { id: 'settings', name: 'Settings', path: '/admin/settings' },
];

async function promoteToSuperAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    const email = 'iconicconceptslimited@gmail.com';
    
    // Find the user
    const user = await usersCollection.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role || 'user'}`);

    // Update to superadmin
    const updateData = {
      role: 'superadmin',
      approved: true,
      pagePermissions: AVAILABLE_PAGES.map((page) => ({
        pageId: page.id,
        permissions: ['view', 'edit', 'delete'],
      })),
      updatedAt: new Date(),
    };

    const result = await usersCollection.updateOne(
      { _id: user._id },
      { $set: updateData }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ User successfully promoted to superadmin!');
      console.log('✅ All permissions granted for all pages');
      console.log('✅ User is now approved');
    } else {
      console.log('⚠️  No changes made (user may already be superadmin)');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

promoteToSuperAdmin();

