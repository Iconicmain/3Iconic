'use client';

import { useState } from 'react';

type Step = 'identity' | 'otp' | 'form' | 'done';

interface AdminOption {
  id: string;
  name: string;
}

interface ExpenseRow {
  key: string;
  description: string;
  category: string;
  date: string;
}

const fetchOpts: RequestInit = {
  credentials: 'omit',
  cache: 'no-store',
};

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function createExpenseRow(): ExpenseRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: '',
    category: '',
    date: todayIso(),
  };
}

export function ExpenseMobileSubmitLite({
  token,
  initialAdmins,
  initialCategories,
}: {
  token: string;
  initialAdmins: AdminOption[];
  initialCategories: string[];
}) {
  const [step, setStep] = useState<Step>('identity');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [submitToken, setSubmitToken] = useState('');
  const [userName, setUserName] = useState('');
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([createExpenseRow()]);

  const stepIndex = step === 'identity' ? 1 : step === 'otp' ? 2 : step === 'form' ? 3 : 3;

  const updateRow = (key: string, patch: Partial<Omit<ExpenseRow, 'key'>>) => {
    setExpenseRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addExpenseRow = () => {
    setExpenseRows((rows) => [...rows, createExpenseRow()]);
  };

  const removeExpenseRow = (key: string) => {
    setExpenseRows((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.key !== key)));
  };

  const sendOtp = async () => {
    if (!selectedUserId) {
      setMsg({ type: 'err', text: 'Select who you are' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/expenses/mobile/request-otp', {
        ...fetchOpts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: selectedUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMaskedPhone(data.maskedPhone);
      setStep('otp');
      setMsg({ type: 'ok', text: `OTP sent to ${data.maskedPhone}` });
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Failed to send OTP' });
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setMsg({ type: 'err', text: 'Enter 6-digit OTP' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/expenses/mobile/verify-otp', {
        ...fetchOpts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: selectedUserId, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitToken(data.submitToken);
      setUserName(data.name);
      setStep('form');
      setMsg({ type: 'ok', text: 'Verified' });
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Invalid OTP' });
    } finally {
      setBusy(false);
    }
  };

  const submitExpenses = async () => {
    for (let i = 0; i < expenseRows.length; i++) {
      const row = expenseRows[i];
      if (!row.description.trim()) {
        setMsg({ type: 'err', text: `Expense ${i + 1}: description is required` });
        return;
      }
      if (!row.category) {
        setMsg({ type: 'err', text: `Expense ${i + 1}: select a category` });
        return;
      }
      if (!row.date) {
        setMsg({ type: 'err', text: `Expense ${i + 1}: date is required` });
        return;
      }
    }

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/expenses/mobile/create', {
        ...fetchOpts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitToken,
          expenses: expenseRows.map(({ description, category, date }) => ({
            description,
            category,
            date,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const ids = Array.isArray(data.expenses)
        ? data.expenses.map((expense: { id: string }) => expense.id).filter(Boolean)
        : data.expense?.id
          ? [data.expense.id]
          : [];

      setCreatedIds(ids);
      setStep('done');
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Failed to submit' });
    } finally {
      setBusy(false);
    }
  };

  if (initialAdmins.length === 0) {
    return (
      <div className="em-center">
        <div>
          <h1 className="em-title">Unavailable</h1>
          <p className="em-muted">No super admins with phone numbers are set up.</p>
        </div>
      </div>
    );
  }

  const submitLabel =
    expenseRows.length === 1
      ? 'Submit Expense'
      : `Submit ${expenseRows.length} Expenses`;

  return (
    <div className="em-page em-theme-submit">
      <header className="em-header">
        <h1 className="em-title">Submit Expense</h1>
        <p className="em-subtitle">3ICONIC · Secure mobile form</p>
        {step !== 'done' && (
          <div className="em-progress" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span key={n} className={stepIndex >= n ? 'on' : ''} />
            ))}
          </div>
        )}
      </header>

      {msg && (
        <div className={`em-msg ${msg.type}`} role="status">
          {msg.text}
        </div>
      )}

      <main className="em-main">
        {step === 'identity' && (
          <div className="em-card">
            <h2 className="em-title" style={{ fontSize: '1rem' }}>
              Who are you?
            </h2>
            <p className="em-muted">
              Select your name. OTP goes to your registered phone (number hidden).
            </p>
            <label className="em-label" htmlFor="submit-admin">
              Super Admin
            </label>
            <select
              id="submit-admin"
              className="em-field"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select who you are</option>
              {initialAdmins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button type="button" className="em-btn" onClick={sendOtp} disabled={busy || !selectedUserId}>
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="em-card">
            <h2 className="em-title" style={{ fontSize: '1rem' }}>
              Enter verification code
            </h2>
            <p className="em-muted">Code sent to {maskedPhone || 'your phone'}</p>
            <label className="em-label" htmlFor="submit-otp">
              6-digit OTP
            </label>
            <input
              id="submit-otp"
              className="em-field em-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button type="button" className="em-btn" onClick={verifyOtp} disabled={busy || otp.length !== 6}>
              {busy ? 'Checking…' : 'Verify & Continue'}
            </button>
            <button type="button" className="em-btn secondary" onClick={() => setStep('identity')} disabled={busy}>
              Change person
            </button>
          </div>
        )}

        {step === 'form' && (
          <>
            <div className="em-badge">
              Verified as <strong>{userName}</strong>
            </div>
            <p className="em-muted" style={{ marginBottom: '1rem' }}>
              Add one or more expenses below, then submit them all at once.
            </p>

            {expenseRows.map((row, index) => (
              <div key={row.key} className="em-card em-expense-row">
                <div className="em-row-head">
                  <h2 className="em-title" style={{ fontSize: '1rem' }}>
                    Expense {index + 1}
                  </h2>
                  {expenseRows.length > 1 && (
                    <button
                      type="button"
                      className="em-remove"
                      onClick={() => removeExpenseRow(row.key)}
                      disabled={busy}
                      aria-label={`Remove expense ${index + 1}`}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label className="em-label" htmlFor={`desc-${row.key}`}>
                  Description *
                </label>
                <input
                  id={`desc-${row.key}`}
                  className="em-field"
                  placeholder="What was this expense for?"
                  value={row.description}
                  onChange={(e) => updateRow(row.key, { description: e.target.value })}
                />

                <label className="em-label" htmlFor={`cat-${row.key}`}>
                  Category *
                </label>
                <select
                  id={`cat-${row.key}`}
                  className="em-field"
                  value={row.category}
                  onChange={(e) => updateRow(row.key, { category: e.target.value })}
                >
                  <option value="">Select category</option>
                  {initialCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <label className="em-label" htmlFor={`date-${row.key}`}>
                  Date *
                </label>
                <input
                  id={`date-${row.key}`}
                  type="date"
                  className="em-field"
                  value={row.date}
                  onChange={(e) => updateRow(row.key, { date: e.target.value })}
                />
              </div>
            ))}

            <button
              type="button"
              className="em-btn secondary em-add-row"
              onClick={addExpenseRow}
              disabled={busy || expenseRows.length >= 20}
            >
              + Add another expense
            </button>

            <p className="em-muted">
              All expenses will be <strong>Pending</strong> until approved.
            </p>
            <button type="button" className="em-btn" onClick={submitExpenses} disabled={busy}>
              {busy ? 'Submitting…' : submitLabel}
            </button>
          </>
        )}

        {step === 'done' && (
          <div className="em-card" style={{ textAlign: 'center' }}>
            <h2 className="em-title">Submitted!</h2>
            <p className="em-muted">
              {createdIds.length === 1
                ? 'Expense is pending super admin approval.'
                : `${createdIds.length} expenses are pending super admin approval.`}
            </p>
            {createdIds.length > 0 && (
              <ul className="em-created-list">
                {createdIds.map((id) => (
                  <li key={id}>
                    <strong>{id}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
