import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { hasPagePermission } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const expensesCollection = db.collection('expenses');

    // Try to find by expense ID first, then by MongoDB _id
    let expense = await expensesCollection.findOne({ id: id });
    
    if (!expense) {
      // Try MongoDB _id if expense ID doesn't match
      if (ObjectId.isValid(id)) {
        expense = await expensesCollection.findOne({ _id: new ObjectId(id) });
      }
    }

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Convert to response format
    const expenseResponse = {
      id: expense.id || expense._id.toString(),
      description: expense.description,
      category: expense.category,
      station: expense.station,
      amount: expense.amount,
      balance: expense.balance,
      date: expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : expense.date,
      status: expense.status,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };

    return NextResponse.json({ expense: expenseResponse }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has edit permission for expenses page
    const hasEditPermission = await hasPagePermission('/admin/expenses', 'edit');
    if (!hasEditPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to edit expenses' },
        { status: 403 }
      );
    }

    const { id } = await params;
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

    // Find the expense by ID or _id
    let expense = await expensesCollection.findOne({ id: id });
    let filter: any = { id: id };
    
    if (!expense) {
      if (ObjectId.isValid(id)) {
        expense = await expensesCollection.findOne({ _id: new ObjectId(id) });
        filter = { _id: new ObjectId(id) };
      }
    }

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Update the expense
    const updateData = {
      description: description.trim(),
      category: category.trim(),
      station: station ? station.trim() : null,
      amount: Number(amount),
      balance: balance !== undefined ? Number(balance) : undefined,
      date: new Date(date),
      status: status || 'partially-paid',
      updatedAt: new Date(),
    };

    const result = await expensesCollection.updateOne(
      filter,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Expense updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user has delete permission for expenses page
    const hasDeletePermission = await hasPagePermission('/admin/expenses', 'delete');
    if (!hasDeletePermission) {
      return NextResponse.json(
        { error: 'You do not have permission to delete expenses' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const expensesCollection = db.collection('expenses');

    // Try to find by expense ID first, then by MongoDB _id
    let expense = await expensesCollection.findOne({ id: id });
    let filter: any = { id: id };
    
    if (!expense) {
      if (ObjectId.isValid(id)) {
        expense = await expensesCollection.findOne({ _id: new ObjectId(id) });
        filter = { _id: new ObjectId(id) };
      }
    }

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    const result = await expensesCollection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Expense deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}

