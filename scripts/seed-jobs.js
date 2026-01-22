const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Jobs from isp-data.ts (converted to JS format)
const defaultJobs = [
  {
    title: 'Field Technician',
    department: 'Operations',
    location: 'Nyeri',
    type: 'Full-time',
    description: 'Install and maintain fiber connections for homes and businesses across Nyeri and surrounding areas.',
    requirements: [
      'Technical diploma or equivalent',
      'Valid driving license',
      'Comfortable working outdoors',
      'Customer service mindset',
    ],
    benefits: [
      'Competitive salary',
      'Health insurance',
      'Equipment provided',
      'Training & growth',
    ],
    salary: 'KSh 45,000 - 60,000',
    experience: '1-2 years',
    applicationDeadline: '2024-12-31',
    responsibilities: [
      'Install fiber optic cables',
      'Troubleshoot connection issues',
      'Maintain network infrastructure',
      'Provide customer support',
    ],
    skills: ['Fiber optics', 'Networking', 'Customer service'],
    applicationEmail: 'careers@iconicfibre.co.ke',
    status: 'open',
    applications: 0,
    postedDate: new Date().toISOString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Network Engineer',
    department: 'Engineering',
    location: 'Nairobi',
    type: 'Full-time',
    description: 'Design and maintain our network infrastructure, ensuring reliability and performance.',
    requirements: [
      'BSc in Computer Science or related field',
      '3+ years network engineering experience',
      'CCNA/CCNP certification preferred',
      'Strong problem-solving skills',
    ],
    benefits: [
      'Competitive salary',
      'Health insurance',
      'Professional development budget',
      'Flexible work arrangements',
    ],
    salary: 'KSh 120,000 - 180,000',
    experience: '3-5 years',
    applicationDeadline: '2024-12-31',
    responsibilities: [
      'Design network architecture',
      'Monitor network performance',
      'Troubleshoot complex issues',
      'Plan capacity upgrades',
    ],
    skills: ['Network design', 'Routing protocols', 'Network security'],
    applicationEmail: 'careers@iconicfibre.co.ke',
    status: 'open',
    applications: 0,
    postedDate: new Date().toISOString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedJobs() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('tixmgmt');
    const jobsCollection = db.collection('jobs');

    // Check if jobs already exist
    const existingCount = await jobsCollection.countDocuments();
    console.log(`Found ${existingCount} existing jobs`);

    if (existingCount > 0) {
      console.log('Jobs already exist. Skipping seed.');
      console.log('To re-seed, delete existing jobs first.');
      return;
    }

    // Insert default jobs
    const result = await jobsCollection.insertMany(defaultJobs);
    console.log(`Successfully inserted ${result.insertedCount} jobs:`);

    defaultJobs.forEach((job, index) => {
      console.log(`  - ${job.title} (${job.department}, ${job.location})`);
    });

    console.log('\nSeeding completed successfully!');
  } catch (error) {
    console.error('Error seeding jobs:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

seedJobs();

