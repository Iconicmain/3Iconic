import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const categoriesCollection = db.collection('categories');

    const categories = await categoriesCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const categoriesCollection = db.collection('categories');

    // Check if category already exists
    const existing = await categoriesCollection.findOne({ 
      name: name.trim() 
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 400 }
      );
    }

    const category = {
      name: name.trim(),
      createdAt: new Date(),
    };

    const result = await categoriesCollection.insertOne(category);

    return NextResponse.json(
      { success: true, category: { ...category, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

