'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, CheckCircle2, ShieldCheck, Banknote, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'identity' | 'otp' | 'approve' | 'done';

interface SuperAdminOption {
  id: string;
  name: string;
}

interface ExpenseData {
  id: string;
  description: string;
  category: string;
  date: string;
  status: string;
  approvalStatus: string;
  submittedByName: string;
}

export function ExpenseApproveClient({ token }: { token: string }) {
  const [step, setStep] = useState<Step>('identity');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [alreadyApproved, setAlreadyApproved] = useState(false);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [approveSessionToken, setApproveSessionToken] = useState('');
  const [approverName, setApproverName] = useState('');
  const [expense, setExpense] = useState<ExpenseData | null>(null);
  const [expenseType, setExpenseType] = useState<'recurrent' | 'capital' | ''>('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetch(`/api/expenses/approve/${token}/admins`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setNotFound(true);
          return;
        }
        if (d.alreadyApproved) {
          setAlreadyApproved(true);
          return;
        }
        setSuperAdmins(d.admins || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const sendOtp = async () => {
    if (!selectedUserId) return toast.error('Select who you are');
    setBusy(true);
    try {
      const res = await fetch(`/api/expenses/approve/${token}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMaskedPhone(data.maskedPhone);
      setStep('otp');
      toast.success(`OTP sent to ${data.maskedPhone}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP');
    setBusy(true);
    try {
      const res = await fetch(`/api/expenses/approve/${token}/verify-otp`, {
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
      toast.success('Verified!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!expenseType) return toast.error('Select expense type');
    if (!amount || Number(amount) <= 0) return toast.error('Enter approved amount');

    setBusy(true);
    try {
      const res = await fetch(`/api/expenses/approve/${token}`, {
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
      toast.success('Expense approved and marked as paid');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-violet-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold">Expense not found</p>
        <p className="text-sm text-muted-foreground mt-2">This approval link may be invalid or expired.</p>
      </div>
    );
  }

  if (alreadyApproved || step === 'done') {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-violet-50 via-white to-slate-50 max-w-lg mx-auto flex flex-col">
        <main className="flex-1 flex items-center justify-center px-5 pb-8">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-3 w-full">
            <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold text-emerald-900">Approved & Paid</h2>
            <p className="text-sm text-emerald-800">
              {expense?.id ? `Expense ${expense.id} has been marked as fully paid.` : 'This expense has already been approved.'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const stepIndex = step === 'identity' ? 1 : step === 'otp' ? 2 : 3;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-violet-50 via-white to-slate-50 max-w-lg mx-auto flex flex-col">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Approve Expense</h1>
            <p className="text-xs text-muted-foreground">Super Admin · Secure verification</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                stepIndex >= n ? 'bg-violet-600' : 'bg-violet-100'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 px-5 pb-8">
        {step === 'identity' && (
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="font-semibold text-base">Who are you?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select your name. A verification code will be sent to your registered phone (number hidden).
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Super Admin</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select who you are" />
                </SelectTrigger>
                <SelectContent>
                  {superAdmins.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="py-3">
                      <span className="font-medium">{a.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-12 text-base bg-violet-600 hover:bg-violet-700"
              onClick={sendOtp}
              disabled={busy || !selectedUserId}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send OTP <ChevronRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="font-semibold text-base">Enter verification code</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Code sent to {maskedPhone || 'your phone'}
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              className="w-full h-12 text-base bg-violet-600 hover:bg-violet-700"
              onClick={verifyOtp}
              disabled={busy || otp.length !== 6}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Continue'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('identity')} disabled={busy}>
              Change person
            </Button>
          </div>
        )}

        {step === 'approve' && expense && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-sm text-violet-700 bg-violet-50 rounded-xl px-4 py-3">
              Verified as <strong>{approverName}</strong>
            </p>

            <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Expense ID</p>
                <p className="font-medium">{expense.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Submitted by</p>
                <p className="font-medium">{expense.submittedByName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Description</p>
                <p className="font-medium">{expense.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
                  <p className="font-medium text-sm">{expense.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                  <p className="font-medium text-sm">{expense.date}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-violet-700">
                <Banknote className="h-5 w-5" />
                <h2 className="font-semibold">Approval details</h2>
              </div>
              <div className="space-y-2">
                <Label>Approved amount (Ksh) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-12 text-lg font-semibold"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Expense type *</Label>
                <Select value={expenseType} onValueChange={(v) => setExpenseType(v as 'recurrent' | 'capital')}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurrent" className="py-3">Recurrent Expense</SelectItem>
                    <SelectItem value="capital" className="py-3">Capital Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full h-12 text-base bg-violet-600 hover:bg-violet-700"
                onClick={handleApprove}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Approve & Mark as Paid'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
