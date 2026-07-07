'use client';

import { useState } from 'react';

type Step = 'identity' | 'otp' | 'approve' | 'done';

interface AdminOption {
  id: string;
  name: string;
}

interface ExpenseData {
  id: string;
  description: string;
  category: string;
  date: string;
  submittedByName: string;
}

const fetchOpts: RequestInit = {
  credentials: 'omit',
  cache: 'no-store',
};

export function ExpenseMobileApproveLite({
  token,
  initialAdmins,
  initialExpenseId,
}: {
  token: string;
  initialAdmins: AdminOption[];
  initialExpenseId?: string;
}) {
  const [step, setStep] = useState<Step>('identity');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [approveSessionToken, setApproveSessionToken] = useState('');
  const [approverName, setApproverName] = useState('');
  const [expense, setExpense] = useState<ExpenseData | null>(
    initialExpenseId ? { id: initialExpenseId, description: '', category: '', date: '', submittedByName: '' } : null
  );
  const [expenseType, setExpenseType] = useState<'recurrent' | 'capital' | ''>('');
  const [amount, setAmount] = useState('');

  const stepIndex = step === 'identity' ? 1 : step === 'otp' ? 2 : 3;

  const sendOtp = async () => {
    if (!selectedUserId) {
      setMsg({ type: 'err', text: 'Select who you are' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/expenses/approve/${token}/request-otp`, {
        ...fetchOpts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
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
      const res = await fetch(`/api/expenses/approve/${token}/verify-otp`, {
        ...fetchOpts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApproveSessionToken(data.approveSessionToken);
      setApproverName(data.name);
      setExpense(data.expense);
      setStep('approve');
      setMsg({ type: 'ok', text: 'Verified' });
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Invalid OTP' });
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!expenseType) {
      setMsg({ type: 'err', text: 'Select expense type' });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setMsg({ type: 'err', text: 'Enter approved amount' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/expenses/approve/${token}`, {
        ...fetchOpts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approveSessionToken,
          expenseType,
          amount: Number(amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('done');
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Approval failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="em-page em-theme-approve">
      <header className="em-header">
        <h1 className="em-title">Approve Expense</h1>
        <p className="em-subtitle">
          Super Admin · {initialExpenseId || expense?.id || 'Secure verification'}
        </p>
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
            <label className="em-label" htmlFor="approve-admin">
              Super Admin
            </label>
            <select
              id="approve-admin"
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
            <button type="button" className="em-btn violet" onClick={sendOtp} disabled={busy || !selectedUserId}>
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
            <label className="em-label" htmlFor="approve-otp">
              6-digit OTP
            </label>
            <input
              id="approve-otp"
              className="em-field em-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button type="button" className="em-btn violet" onClick={verifyOtp} disabled={busy || otp.length !== 6}>
              {busy ? 'Checking…' : 'Verify & Continue'}
            </button>
            <button type="button" className="em-btn secondary" onClick={() => setStep('identity')} disabled={busy}>
              Change person
            </button>
          </div>
        )}

        {step === 'approve' && expense && (
          <>
            <div className="em-badge">
              Verified as <strong>{approverName}</strong>
            </div>
            <div className="em-card">
              <dl className="em-kv">
                <dt>Expense ID</dt>
                <dd>{expense.id}</dd>
              </dl>
              <dl className="em-kv">
                <dt>Submitted by</dt>
                <dd>{expense.submittedByName}</dd>
              </dl>
              <dl className="em-kv">
                <dt>Description</dt>
                <dd>{expense.description}</dd>
              </dl>
              <div className="em-grid">
                <dl className="em-kv">
                  <dt>Category</dt>
                  <dd>{expense.category}</dd>
                </dl>
                <dl className="em-kv">
                  <dt>Date</dt>
                  <dd>{expense.date}</dd>
                </dl>
              </div>
            </div>
            <div className="em-card">
              <h2 className="em-title" style={{ fontSize: '1rem' }}>
                Approval details
              </h2>
              <label className="em-label" htmlFor="amount">
                Approved amount (Ksh) *
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                className="em-field"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <label className="em-label" htmlFor="type">
                Expense type *
              </label>
              <select
                id="type"
                className="em-field"
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value as 'recurrent' | 'capital' | '')}
              >
                <option value="">Select type</option>
                <option value="recurrent">Recurrent Expense</option>
                <option value="capital">Capital Expense</option>
              </select>
              <button type="button" className="em-btn violet" onClick={handleApprove} disabled={busy}>
                {busy ? 'Approving…' : 'Approve & Mark as Paid'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="em-card" style={{ textAlign: 'center' }}>
            <h2 className="em-title">Approved & Paid</h2>
            <p className="em-muted">
              Expense <strong>{expense?.id}</strong> has been marked as fully paid.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
