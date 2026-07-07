'use client';

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemIds: string[];
  mergedCount?: number;
  onDeleted?: () => void;
}

export function DeleteStockDialog({
  open,
  onOpenChange,
  itemName,
  itemIds,
  mergedCount = 1,
  onDeleted,
}: DeleteStockDialogProps) {
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      setOtp('');
      setOtpSent(false);
      setMaskedPhone('');
      setSendingOtp(false);
      setDeleting(false);
    }
  }, [open]);

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await fetch('/api/isp/inventory/request-delete-otp', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setOtpSent(true);
      setMaskedPhone(data.maskedPhone || '');
      toast.success(data.message || 'OTP sent to your phone');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleDelete = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/isp/inventory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete stock');

      toast.success(`Deleted "${itemName}"`);
      onOpenChange(false);
      onDeleted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete stock');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Delete stock
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                You are about to permanently delete <strong className="text-foreground">{itemName}</strong>
                {mergedCount > 1 && (
                  <> ({mergedCount} merged stock entries)</>
                )}
                . This cannot be undone.
              </p>
              <p>Only super admins can delete stock. An OTP will be sent to the phone number on your account.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {!otpSent ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleSendOtp}
              disabled={sendingOtp}
            >
              {sendingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending OTP…
                </>
              ) : (
                'Send OTP to my phone'
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-center text-muted-foreground">
                Enter the 6-digit code sent to {maskedPhone || 'your phone'}
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={handleSendOtp}
                disabled={sendingOtp}
              >
                Resend OTP
              </Button>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!otpSent || otp.length !== 6 || deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete stock
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
