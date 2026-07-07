/**
 * Migration script to move users from 'test' database to 'tixmgmt' database
 * Run this script once to transfer existing users to the correct database
 * 
 * Usage: node scripts/migrate-users-to-tixmgmt.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function migrateUsers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Access both databases
    const testDb = client.db('test');
    const tixmgmtDb = client.db('tixmgmt');
    
    const testUsersCollection = testDb.collection('users');
    const tixmgmtUsersCollection = tixmgmtDb.collection('users');

    // Check if there are users in the test database
    const testUsersCount = await testUsersCollection.countDocuments();
    console.log(`Found ${testUsersCount} users in 'test' database`);

    if (testUsersCount === 0) {
      console.log('No users to migrate. Exiting.');
      return;
    }

    // Fetch all users from test database
    const testUsers = await testUsersCollection.find({}).toArray();
    console.log(`\nUsers to migrate:`);
    testUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });

    // Check for duplicates in tixmgmt database
    const existingEmails = await tixmgmtUsersCollection.find({}).toArray();
    const existingEmailSet = new Set(existingEmails.map(u => u.email.toLowerCase()));
    
    const usersToInsert = [];
    const usersToSkip = [];

    for (const user of testUsers) {
      if (existingEmailSet.has(user.email.toLowerCase())) {
        usersToSkip.push(user);
        console.log(`\n⚠️  Skipping ${user.email} - already exists in tixmgmt database`);
      } else {
        usersToInsert.push(user);
      }
    }

    if (usersToInsert.length > 0) {
      // Insert users into tixmgmt database
      const result = await tixmgmtUsersCollection.insertMany(usersToInsert);
      console.log(`\n✅ Successfully migrated ${result.insertedCount} users to 'tixmgmt' database`);
    }

    if (usersToSkip.length > 0) {
      console.log(`\n⚠️  Skipped ${usersToSkip.length} users (already exist in tixmgmt)`);
    }

    // Optionally, delete users from test database after successful migration
    if (usersToInsert.length > 0) {
      const deleteResult = await testUsersCollection.deleteMany({
        _id: { $in: usersToInsert.map(u => u._id) }
      });
      console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} users from 'test' database`);
    }

    // Verify migration
    const finalTixmgmtCount = await tixmgmtUsersCollection.countDocuments();
    const finalTestCount = await testUsersCollection.countDocuments();
    
    console.log(`\n📊 Final counts:`);
    console.log(`  - 'tixmgmt' database: ${finalTixmgmtCount} users`);
    console.log(`  - 'test' database: ${finalTestCount} users`);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

migrateUsers();

