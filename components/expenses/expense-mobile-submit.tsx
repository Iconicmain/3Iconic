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
import { Loader2, CheckCircle2, Shield, FileText, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'identity' | 'otp' | 'form' | 'done';

interface SuperAdminOption {
  id: string;
  name: string;
}

export function ExpenseMobileSubmit({ token }: { token: string }) {
  const [step, setStep] = useState<Step>('identity');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminOption[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [submitToken, setSubmitToken] = useState('');
  const [userName, setUserName] = useState('');
  const [form, setForm] = useState({
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [createdId, setCreatedId] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/expenses/mobile/admins', {
        headers: { 'x-expense-submit-token': token },
      }).then((r) => r.json()),
      fetch('/api/expense-categories').then((r) => r.json()),
    ])
      .then(([adminRes, catRes]) => {
        if (adminRes.error) {
          setInvalidLink(true);
          return;
        }
        setSuperAdmins(adminRes.admins || []);
        setCategories(catRes.categories?.map((c: { name: string }) => c.name) || []);
      })
      .catch(() => setInvalidLink(true))
      .finally(() => setLoading(false));
  }, [token]);

  const sendOtp = async () => {
    if (!selectedUserId) return toast.error('Select who you are');
    setBusy(true);
    try {
      const res = await fetch('/api/expenses/mobile/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: selectedUserId }),
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
      const res = await fetch('/api/expenses/mobile/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: selectedUserId, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitToken(data.submitToken);
      setUserName(data.name);
      setStep('form');
      toast.success('Verified!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  };

  const submitExpense = async () => {
    if (!form.description.trim()) return toast.error('Description is required');
    if (!form.category) return toast.error('Select a category');
    if (!form.date) return toast.error('Date is required');

    setBusy(true);
    try {
      const res = await fetch('/api/expenses/mobile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submitToken, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedId(data.expense?.id || '');
      setStep('done');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (invalidLink) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-red-50 to-white">
        <Shield className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold">Link unavailable</h1>
        <p className="text-muted-foreground mt-2 text-sm">Ask a super admin for the expense submission link.</p>
      </div>
    );
  }

  const stepIndex = step === 'identity' ? 1 : step === 'otp' ? 2 : step === 'form' ? 3 : 4;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-50 via-white to-slate-50 flex flex-col max-w-lg mx-auto">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Submit Expense</h1>
            <p className="text-xs text-muted-foreground">3ICONIC · Secure mobile form</p>
          </div>
        </div>
        {step !== 'done' && (
          <div className="flex gap-2 mt-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  stepIndex >= n ? 'bg-emerald-600' : 'bg-emerald-100'
                }`}
              />
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 px-5 pb-8">
        {step === 'identity' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
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
                className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
                onClick={sendOtp}
                disabled={busy || !selectedUserId}
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send OTP <ChevronRight className="ml-1 h-4 w-4" /></>}
              </Button>
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5 text-center">
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
                className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
                onClick={verifyOtp}
                disabled={busy || otp.length !== 6}
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Continue'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep('identity')} disabled={busy}>
                Change person
              </Button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
              Verified as <strong>{userName}</strong>
            </p>
            <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description *</Label>
                <Input
                  className="h-12 text-base"
                  placeholder="What was this expense for?"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="py-3">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date *</Label>
                <Input
                  type="date"
                  className="h-12 text-base"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Status will be set to <strong>Pending</strong> until a super admin approves.
              </p>
              <Button
                className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
                onClick={submitExpense}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit Expense'}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="rounded-2xl border bg-white p-8 shadow-sm text-center space-y-4 animate-in fade-in zoom-in-95 duration-300 mt-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold">Submitted!</h2>
            <p className="text-muted-foreground text-sm">
              Expense <strong>{createdId}</strong> is pending super admin approval. You&apos;ll be notified once approved.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
