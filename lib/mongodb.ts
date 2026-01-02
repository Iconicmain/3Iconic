import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri = process.env.MONGODB_URI;
// Optimize MongoDB connection options for performance and reliability
const options: import('mongodb').MongoClientOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // How long to try selecting a server (5 seconds)
  socketTimeoutMS: 45000, // How long to wait for socket connection (45 seconds)
  connectTimeoutMS: 10000, // How long to wait for initial connection (10 seconds)
  retryWrites: true, // Retry writes that fail due to network errors
  retryReads: true, // Retry reads that fail due to network errors
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

