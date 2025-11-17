import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DEFAULT_CATEGORIES = [
  'Installation',
  'Maintenance',
  'Support',
  'Repair',
];

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const categoriesCollection = db.collection('categories');

    // Check if categories already exist
    const existingCount = await categoriesCollection.countDocuments();
    
    if (existingCount > 0) {
      return NextResponse.json(
        { message: 'Categories already exist in database', count: existingCount },
        { status: 200 }
      );
    }

    // Insert default categories
    const categoriesToInsert = DEFAULT_CATEGORIES.map(name => ({
      name,
      createdAt: new Date(),
    }));

    const result = await categoriesCollection.insertMany(categoriesToInsert);

    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully seeded ${result.insertedCount} categories`,
        categories: categoriesToInsert
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error seeding categories:', error);
    return NextResponse.json(
      { error: 'Failed to seed categories' },
      { status: 500 }
    );
  }
}

