import './expense-mobile.css';

export const metadata = {
  title: '3ICONIC Expenses',
  description: 'Quick secure expense submit and approve',
};

export default function ExpenseMobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="em-root" data-expense-mobile="true">
      {children}
    </div>
  );
}
