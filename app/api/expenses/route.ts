import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const expensesCollection = db.collection('expenses');

    const expenses = await expensesCollection
      .find({})
      .sort({ date: -1 })
      .toArray();

    // Convert _id to string and date to ISO string for JSON serialization
    const expensesWithStringIds = expenses.map((exp) => ({
      id: exp.id || exp._id.toString(),
      description: exp.description,
      category: exp.category,
      station: exp.station,
      amount: exp.amount,
      balance: exp.balance,
      date: exp.date instanceof Date ? exp.date.toISOString().split('T')[0] : exp.date,
      status: exp.status,
      createdAt: exp.createdAt,
      updatedAt: exp.updatedAt,
    }));

    return NextResponse.json({ expenses: expensesWithStringIds }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      description,
      category,
      station,
      amount,
      balance,
      date,
      status,
    } = body;

    // Validate required fields (station is optional)
    if (!description || !category || !amount || !date) {
      return NextResponse.json(
        { error: 'Description, category, amount, and date are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const expensesCollection = db.collection('expenses');

    // Generate expense ID
    const count = await expensesCollection.countDocuments();
    const expenseId = `EXP-${String(count + 1).padStart(3, '0')}`;

    const expense = {
      id: expenseId,
      description: description.trim(),
      category: category.trim(),
      station: station ? station.trim() : null,
      amount: Number(amount),
      balance: balance !== undefined ? Number(balance) : undefined,
      date: new Date(date),
      status: status || 'partially-paid',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await expensesCollection.insertOne(expense);

    return NextResponse.json(
      { success: true, expense: { ...expense, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

