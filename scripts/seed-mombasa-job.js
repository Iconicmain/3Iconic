const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Mombasa Fibre Technician Job
const mombasaJob = {
  title: 'Fibre Technician (FTTH / FTTB)',
  department: 'Operations',
  location: 'Mombasa',
  type: 'Full-time',
  roleOverview: 'We are looking for a hands-on Fibre Technician to support the installation, maintenance, and troubleshooting of our fibre internet network. This role involves fieldwork, customer interaction, and working with live fibre infrastructure to deliver reliable internet services.',
  description: 'This is written to attract serious, capable technicians, not random applicants. Join our team in Mombasa and help connect homes and businesses with reliable fibre internet.',
  responsibilities: [
    'Install and terminate fibre for FTTH / FTTB customers',
    'Perform fibre splicing (fusion & mechanical)',
    'Test fibre links using power meter / VFL / OTDR',
    'Install ONTs, routers, and customer premises equipment',
    'Troubleshoot fibre faults (low signal, breaks, misalignment)',
    'Work on poles, ducts, and building risers safely',
    'Liaise with NOC and support teams during faults',
    'Educate customers on basic usage and care',
    'Maintain accurate job and installation records',
  ],
  requirements: [
    'Proven experience in fibre installation or maintenance',
    'Comfortable working outdoors and at heights (poles)',
    'Understanding of optical power levels (dBm)',
    'Understanding of splitters and fibre routing',
    'Basic networking knowledge (routers, LAN, Wi-Fi)',
    'Ability to use fibre tools confidently',
    'Good communication and customer handling skills',
    'Physically fit and safety-conscious',
  ],
  minimumRequirements: [
    'At least 1 year experience in fibre or telecom field work',
    'Familiar with FTTH / GPON / XPON environments',
    'Valid ID and phone number',
    'Based within or near the deployment area',
  ],
  niceToHave: [
    'Experience with XPON or GPON networks',
    'Ability to read simple network diagrams',
    'Motorbike riding experience (with or without license)',
    'Basic knowledge of MikroTik / router setup',
    'Electrical or telecom certification',
  ],
  benefits: [
    'Competitive pay (role-based)',
    'Field allowances where applicable',
    'Training and skills growth',
    'Stable long-term work',
    'Opportunity to grow into senior technician or network engineer roles',
  ],
  salary: 'Competitive (role-based)',
  experience: '1-2 years',
  applicationDeadline: '',
  skills: ['Fibre installation', 'Fibre splicing', 'FTTH', 'FTTB', 'GPON', 'XPON', 'Network troubleshooting'],
  applicationEmail: 'careers@iconicfibre.co.ke',
  safetyNote: 'This role involves working at heights and handling live fibre. Strict safety procedures must be followed at all times.',
  status: 'open',
  applications: 0,
  postedDate: new Date().toISOString(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function seedMombasaJob() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('tixmgmt');
    const jobsCollection = db.collection('jobs');

    // Check if Mombasa job already exists
    const existingJob = await jobsCollection.findOne({
      title: 'Fibre Technician (FTTH / FTTB)',
      location: 'Mombasa',
    });

    if (existingJob) {
      console.log('Mombasa Fibre Technician job already exists. Skipping seed.');
      console.log('To re-seed, delete the existing job first.');
      return;
    }

    // Insert the job
    const result = await jobsCollection.insertOne(mombasaJob);
    console.log(`Successfully inserted Mombasa Fibre Technician job:`);
    console.log(`  - ${mombasaJob.title} (${mombasaJob.department}, ${mombasaJob.location})`);
    console.log(`  - ID: ${result.insertedId}`);

    console.log('\nSeeding completed successfully!');
  } catch (error) {
    console.error('Error seeding Mombasa job:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

seedMombasaJob();

