'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { toast } from 'sonner';
import { Send, MessageSquare, Phone } from 'lucide-react';

export default function SendMessageClient() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    let digits = value.replace(/\D/g, '');
    
    // If user starts typing with 254, keep it
    if (digits.startsWith('254')) {
      return digits;
    }
    
    // If user starts with 0, remove it (we'll add +254)
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    
    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // Validate phone number (should be 9 digits after removing leading 0, or 12 digits if starting with 254)
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < 9) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          message: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send SMS');
      }

      toast.success('SMS sent successfully!');
      
      // Clear form
      setPhoneNumber('');
      setMessage('');
    } catch (error) {
      console.error('Error sending SMS:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send SMS';
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const displayPhoneNumber = phoneNumber ? `+254${phoneNumber}` : '';

  return (
    <div className="flex">
      <Sidebar />
      <div className="md:ml-72 flex-1">
        <Header />
        <main className="mt-32 md:mt-0 pr-4 md:pr-8 pt-4 md:pt-8 pb-4 md:pb-8 pl-4 md:pl-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                Send SMS Message
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Send SMS messages to clients
              </p>
            </div>

            {/* Send Message Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Compose Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Phone Number Input */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-medium">+254</span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="712345678"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className="pl-20"
                      maxLength={12}
                      disabled={sending}
                    />
                  </div>
                  {displayPhoneNumber && (
                    <p className="text-xs text-muted-foreground">
                      Full number: {displayPhoneNumber}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number without the country code. The system will automatically add +254.
                  </p>
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-32"
                    disabled={sending}
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      SMS messages are typically 160 characters. Longer messages may be split.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {message.length}/500 characters
                    </p>
                  </div>
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSend}
                  disabled={sending || !phoneNumber.trim() || !message.trim()}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send SMS
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

