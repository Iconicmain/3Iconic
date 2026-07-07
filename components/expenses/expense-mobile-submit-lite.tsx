'use client';

import { useState } from 'react';

type Step = 'identity' | 'otp' | 'form' | 'done';

interface AdminOption {
  id: string;
  name: string;
}

const fetchOpts: RequestInit = {
  credentials: 'omit',
  cache: 'no-store',
};

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
  const [createdId, setCreatedId] = useState('');
  const [form, setForm] = useState({
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });

  const stepIndex = step === 'identity' ? 1 : step === 'otp' ? 2 : step === 'form' ? 3 : 3;

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

  const submitExpense = async () => {
    if (!form.description.trim()) {
      setMsg({ type: 'err', text: 'Description is required' });
      return;
    }
    if (!form.category) {
      setMsg({ type: 'err', text: 'Select a category' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/expenses/mobile/create', {
        ...fetchOpts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submitToken, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedId(data.expense?.id || '');
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
            <div className="em-card">
              <label className="em-label" htmlFor="desc">
                Description *
              </label>
              <input
                id="desc"
                className="em-field"
                placeholder="What was this expense for?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <label className="em-label" htmlFor="cat">
                Category *
              </label>
              <select
                id="cat"
                className="em-field"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">Select category</option>
                {initialCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="em-label" htmlFor="date">
                Date *
              </label>
              <input
                id="date"
                type="date"
                className="em-field"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
              <p className="em-muted">Status will be <strong>Pending</strong> until approved.</p>
              <button type="button" className="em-btn" onClick={submitExpense} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit Expense'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="em-card" style={{ textAlign: 'center' }}>
            <h2 className="em-title">Submitted!</h2>
            <p className="em-muted">
              Expense <strong>{createdId}</strong> is pending super admin approval.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
