'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ExpenseList } from '@/components/expenses/expense-list';
import { ExpenseCharts } from '@/components/expenses/expense-charts';

export default function ExpensesPage() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1">
        <Header />
        <main className="mt-32 md:mt-0 pr-4 md:pr-8 pt-4 md:pt-8 pb-4 md:pb-8 pl-4 md:pl-6">
          <ExpenseCharts />
          <div className="mt-8">
            <ExpenseList />
          </div>
        </main>
      </div>
    </div>
  );
}
