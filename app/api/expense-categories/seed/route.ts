import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DEFAULT_EXPENSE_CATEGORIES = [
  'Equipment',
  'Maintenance',
  'Supplies',
  'Labor',
];

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const expenseCategoriesCollection = db.collection('expenseCategories');

    // Check if categories already exist
    const existingCount = await expenseCategoriesCollection.countDocuments();
    
    if (existingCount > 0) {
      return NextResponse.json(
        { message: 'Expense categories already exist in database', count: existingCount },
        { status: 200 }
      );
    }

    // Insert default categories
    const categoriesToInsert = DEFAULT_EXPENSE_CATEGORIES.map(name => ({
      name,
      createdAt: new Date(),
    }));

    const result = await expenseCategoriesCollection.insertMany(categoriesToInsert);

    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully seeded ${result.insertedCount} expense categories`,
        categories: categoriesToInsert
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error seeding expense categories:', error);
    return NextResponse.json(
      { error: 'Failed to seed expense categories' },
      { status: 500 }
    );
  }
}

