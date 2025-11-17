const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read .env.local file and parse all environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = {};
  
  try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    // Handle both Windows (\r\n) and Unix (\n) line endings
    const lines = envFile.split(/\r?\n/);
    
    console.log(`Reading .env.local from: ${envPath}`);
    console.log(`Found ${lines.length} lines in file`);
    console.log(`File size: ${envFile.length} characters\n`);
    
    // Debug: show first few lines
    if (lines.length > 0) {
      console.log('First few lines:');
      lines.slice(0, 5).forEach((line, idx) => {
        console.log(`  Line ${idx + 1}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
      });
      console.log('');
    }
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        if (trimmedLine) {
          console.log(`  Skipped comment/empty line ${i + 1}`);
        }
        continue;
      }
      
      // Parse KEY=VALUE format (handle cases with or without spaces around =)
      // Also handle cases where there might be no equals sign (just show the line)
      if (!trimmedLine.includes('=')) {
        console.log(`  Warning: Line ${i + 1} has no '=' sign: ${trimmedLine.substring(0, 50)}`);
        continue;
      }
      
      const match = trimmedLine.match(/^([^=#]+?)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        env[key] = value;
        console.log(`  ✓ Loaded: ${key} = ${value.substring(0, 40)}${value.length > 40 ? '...' : ''}`);
      } else {
        console.log(`  ✗ Failed to parse line ${i + 1}: ${trimmedLine.substring(0, 60)}`);
      }
    }
  } catch (error) {
    console.error('Error reading .env.local:', error.message);
    console.error(`Tried to read from: ${path.join(__dirname, '..', '.env.local')}`);
    process.exit(1);
  }
  
  return env;
}

// Load environment variables
const env = loadEnvFile();

// Get MongoDB URI
const uri = env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not defined in .env.local');
  console.error('Please make sure .env.local exists and contains MONGODB_URI');
  console.error('\nAvailable environment variables found:');
  Object.keys(env).forEach(key => {
    console.error(`  - ${key}`);
  });
  process.exit(1);
}

console.log('Environment variables loaded:');
console.log(`  - MONGODB_URI: ${uri.substring(0, 20)}...`);
if (env.CLOUDINARY_CLOUD_NAME) {
  console.log(`  - CLOUDINARY_CLOUD_NAME: ${env.CLOUDINARY_CLOUD_NAME}`);
}
if (env.CLOUDINARY_API_KEY) {
  console.log(`  - CLOUDINARY_API_KEY: ${env.CLOUDINARY_API_KEY.substring(0, 10)}...`);
}
console.log('');

const client = new MongoClient(uri);

const sampleTickets = [
  {
    ticketId: 'TKT-001',
    clientName: 'Acme Corp',
    clientNumber: 'CL-001',
    station: 'Station A',
    houseNumber: 'Building 12, Room 304',
    category: 'Installation',
    dateTimeReported: new Date('2024-01-15T10:30:00'),
    problemDescription: 'Need to install new network equipment in the server room. Multiple devices need to be configured.',
    status: 'open',
    technician: 'John Smith',
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
  },
  {
    ticketId: 'TKT-002',
    clientName: 'TechStart Inc',
    clientNumber: 'CL-002',
    station: 'Station B',
    houseNumber: 'Barrack 5, Unit 12',
    category: 'Maintenance',
    dateTimeReported: new Date('2024-01-14T14:15:00'),
    problemDescription: 'Regular maintenance check required for all equipment. Some devices showing warning signs.',
    status: 'in-progress',
    technician: 'Sarah Jones',
    createdAt: new Date('2024-01-14T14:15:00'),
    updatedAt: new Date('2024-01-14T14:15:00'),
  },
];

async function seedTickets() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('tixmgmt');
    const ticketsCollection = db.collection('tickets');

    // Check if tickets already exist
    const existingCount = await ticketsCollection.countDocuments();
    console.log(`Found ${existingCount} existing tickets`);

    // Insert sample tickets
    const result = await ticketsCollection.insertMany(sampleTickets);
    console.log(`Successfully inserted ${result.insertedCount} tickets:`);
    
    sampleTickets.forEach((ticket, index) => {
      console.log(`  - ${ticket.ticketId}: ${ticket.clientName} (${ticket.category})`);
    });

    console.log('\nSeeding completed successfully!');
  } catch (error) {
    console.error('Error seeding tickets:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

seedTickets();

