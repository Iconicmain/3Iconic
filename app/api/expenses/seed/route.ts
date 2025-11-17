import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Get current date info
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth(); // 0-11
const currentMonthName = now.toLocaleString('default', { month: 'short' });

// Generate seed data that matches the charts
// Charts show: Jan-Jun with expenses 4200-6800
// Categories: Equipment (12000), Labor (8500), Maintenance (6200), Supplies (4100)
// Stations: Station A (3200), B (2800), C (3500), D (2400), E (2900)

const generateSeedData = () => {
  const expenses = [];
  let expenseCounter = 1;

  // Generate expenses for current month (to show in monthly summary)
  // Current month should have around 5000-6000 total to match chart trend
  const currentMonthExpenses = [
    { description: 'Equipment Purchase', category: 'Equipment', station: 'Station A', amount: 2500, date: new Date(currentYear, currentMonth, 15), status: 'fully-paid' },
    { description: 'Maintenance Service', category: 'Maintenance', station: 'Station B', amount: 850, date: new Date(currentYear, currentMonth, 14), status: 'fully-paid' },
    { description: 'Cable & Connectors', category: 'Supplies', station: 'Station C', amount: 450, balance: 200, date: new Date(currentYear, currentMonth, 13), status: 'partially-paid' },
    { description: 'Installation Labor', category: 'Labor', station: 'Station A', amount: 1200, date: new Date(currentYear, currentMonth, 12), status: 'fully-paid' },
    { description: 'Repair Parts', category: 'Equipment', station: 'Station D', amount: 680, balance: 350, date: new Date(currentYear, currentMonth, 11), status: 'partially-paid' },
  ];

  // Generate expenses for previous months to match chart data
  // January (4200 total)
  expenses.push(
    { description: 'Network Equipment', category: 'Equipment', station: 'Station A', amount: 1500, date: new Date(currentYear, 0, 10), status: 'approved' },
    { description: 'Monthly Maintenance', category: 'Maintenance', station: 'Station B', amount: 800, date: new Date(currentYear, 0, 15), status: 'approved' },
    { description: 'Installation Services', category: 'Labor', station: 'Station C', amount: 1200, date: new Date(currentYear, 0, 20), status: 'approved' },
    { description: 'Cables & Supplies', category: 'Supplies', station: 'Station D', amount: 700, date: new Date(currentYear, 0, 25), status: 'approved' },
  );

  // February (5100 total)
  expenses.push(
    { description: 'Server Equipment', category: 'Equipment', station: 'Station A', amount: 2000, date: new Date(currentYear, 1, 5), status: 'approved' },
    { description: 'Repair Services', category: 'Maintenance', station: 'Station B', amount: 900, date: new Date(currentYear, 1, 12), status: 'approved' },
    { description: 'Installation Labor', category: 'Labor', station: 'Station C', amount: 1500, date: new Date(currentYear, 1, 18), status: 'approved' },
    { description: 'Network Supplies', category: 'Supplies', station: 'Station E', amount: 700, date: new Date(currentYear, 1, 22), status: 'pending' },
  );

  // March (4800 total)
  expenses.push(
    { description: 'Router Equipment', category: 'Equipment', station: 'Station A', amount: 1800, date: new Date(currentYear, 2, 8), status: 'approved' },
    { description: 'Preventive Maintenance', category: 'Maintenance', station: 'Station B', amount: 750, date: new Date(currentYear, 2, 14), status: 'approved' },
    { description: 'Setup Labor', category: 'Labor', station: 'Station C', amount: 1300, date: new Date(currentYear, 2, 20), status: 'approved' },
    { description: 'Connectors & Cables', category: 'Supplies', station: 'Station D', amount: 950, date: new Date(currentYear, 2, 25), status: 'approved' },
  );

  // April (6200 total)
  expenses.push(
    { description: 'Switch Equipment', category: 'Equipment', station: 'Station A', amount: 2200, date: new Date(currentYear, 3, 3), status: 'approved' },
    { description: 'System Maintenance', category: 'Maintenance', station: 'Station B', amount: 1000, date: new Date(currentYear, 3, 10), status: 'approved' },
    { description: 'Installation Work', category: 'Labor', station: 'Station C', amount: 1800, date: new Date(currentYear, 3, 16), status: 'approved' },
    { description: 'Equipment Supplies', category: 'Supplies', station: 'Station E', amount: 1200, date: new Date(currentYear, 3, 22), status: 'approved' },
  );

  // May (5400 total)
  expenses.push(
    { description: 'Access Point Equipment', category: 'Equipment', station: 'Station A', amount: 1900, date: new Date(currentYear, 4, 5), status: 'approved' },
    { description: 'Regular Maintenance', category: 'Maintenance', station: 'Station B', amount: 850, date: new Date(currentYear, 4, 12), status: 'approved' },
    { description: 'Service Labor', category: 'Labor', station: 'Station C', amount: 1600, date: new Date(currentYear, 4, 18), status: 'approved' },
    { description: 'Installation Supplies', category: 'Supplies', station: 'Station D', amount: 1050, date: new Date(currentYear, 4, 24), status: 'approved' },
  );

  // June (6800 total)
  expenses.push(
    { description: 'Firewall Equipment', category: 'Equipment', station: 'Station A', amount: 2400, date: new Date(currentYear, 5, 2), status: 'approved' },
    { description: 'Comprehensive Maintenance', category: 'Maintenance', station: 'Station B', amount: 1100, date: new Date(currentYear, 5, 9), status: 'approved' },
    { description: 'Project Labor', category: 'Labor', station: 'Station C', amount: 2000, date: new Date(currentYear, 5, 15), status: 'approved' },
    { description: 'Project Supplies', category: 'Supplies', station: 'Station E', amount: 1300, date: new Date(currentYear, 5, 21), status: 'approved' },
  );

  // Add current month expenses
  expenses.push(...currentMonthExpenses);

  // Add expense IDs and timestamps
  return expenses.map((exp, index) => ({
    id: `EXP-${String(expenseCounter++).padStart(3, '0')}`,
    description: exp.description,
    category: exp.category,
    station: exp.station,
    amount: exp.amount,
    balance: exp.balance,
    date: exp.date,
    status: exp.status,
    createdAt: exp.date,
    updatedAt: exp.date,
  }));
};

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('tixmgmt');
    const expensesCollection = db.collection('expenses');

    // Check if expenses already exist
    const existingCount = await expensesCollection.countDocuments();
    
    // Only insert if collection is empty
    if (existingCount > 0) {
      return NextResponse.json(
        { message: `Database already has ${existingCount} expenses. Skipping seed.` },
        { status: 200 }
      );
    }

    // Generate and insert seed data
    const sampleExpenses = generateSeedData();
    const result = await expensesCollection.insertMany(sampleExpenses);
    
    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully seeded ${result.insertedCount} expenses`,
        expenses: sampleExpenses.map(e => e.id)
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error seeding expenses:', error);
    return NextResponse.json(
      { error: 'Failed to seed expenses' },
      { status: 500 }
    );
  }
}

