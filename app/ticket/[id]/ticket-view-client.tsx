'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, XCircle, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { signIn } from 'next-auth/react';

interface Ticket {
  _id?: string;
  ticketId: string;
  clientName: string;
  clientNumber: string;
  station: string;
  houseNumber: string;
  category: string;
  dateTimeReported: string | Date;
  problemDescription: string;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  technician?: string;
  resolutionNotes?: string;
}

interface TicketViewClientProps {
  ticket: Ticket;
  isAuthenticated: boolean;
  userEmail: string | null;
}

export function TicketViewClient({ ticket, isAuthenticated, userEmail }: TicketViewClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [loading, setLoading] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'Open', icon: AlertCircle, className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      'in-progress': { label: 'In Progress', icon: Clock, className: 'bg-blue-100 text-blue-800 border-blue-300' },
      resolved: { label: 'Resolved', icon: CheckCircle2, className: 'bg-green-100 text-green-800 border-green-300' },
      closed: { label: 'Closed', icon: XCircle, className: 'bg-gray-100 text-gray-800 border-gray-300' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} flex items-center gap-1 px-3 py-1`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleResolve = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to mark ticket as resolved');
      signIn();
      return;
    }

    setLoading(true);
    try {
      // Find ticket by ticketId (not _id) since we're using ticketId in the URL
      const response = await fetch(`/api/tickets/by-ticket-id/${ticket.ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'resolved',
          resolutionNotes: resolutionNotes.trim() || 'Ticket resolved by admin',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resolve ticket');
      }

      toast.success('Ticket marked as resolved!');
      setStatus('resolved');
      setResolveDialogOpen(false);
      setResolutionNotes('');
      router.refresh();
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to resolve ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ticket Details</h1>
          <p className="text-gray-600">View and manage ticket information</p>
        </div>

        {/* Ticket Card */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {ticket.ticketId}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(status)}
                </div>
              </div>
              {status !== 'resolved' && status !== 'closed' && (
                <Button
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error('Please sign in to mark ticket as resolved');
                      signIn();
                      return;
                    }
                    setResolveDialogOpen(true);
                  }}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  disabled={loading}
                >
                  {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                  {isAuthenticated ? 'Mark as Resolved' : 'Sign In to Resolve'}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Client Information</h3>
                <div>
                  <label className="text-sm font-medium text-gray-500">Client Name</label>
                  <p className="text-gray-900 font-medium">{ticket.clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-gray-900 font-medium">{ticket.clientNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">House Number</label>
                  <p className="text-gray-900 font-medium">{ticket.houseNumber}</p>
                </div>
              </div>

              {/* Ticket Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Ticket Information</h3>
                <div>
                  <label className="text-sm font-medium text-gray-500">Station</label>
                  <p className="text-gray-900 font-medium">{ticket.station}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900 font-medium">{ticket.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reported On</label>
                  <p className="text-gray-900 font-medium">{formatDate(ticket.dateTimeReported)}</p>
                </div>
                {ticket.technician && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assigned Technician</label>
                    <p className="text-gray-900 font-medium">{ticket.technician}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Problem Description */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Problem Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {ticket.problemDescription}
              </p>
            </div>

            {/* Resolution Notes */}
            {ticket.resolutionNotes && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Resolution Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-green-50 p-4 rounded-lg border border-green-200">
                  {ticket.resolutionNotes}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-medium">Created:</span> {formatDate(ticket.createdAt)}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span> {formatDate(ticket.updatedAt)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sign In Prompt */}
        {!isAuthenticated && (
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Sign In Required</h3>
                  <p className="text-sm text-blue-700">
                    You need to sign in to mark tickets as resolved or update their status.
                  </p>
                </div>
                <Button
                  onClick={() => signIn()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Resolve Dialog */}
      <AlertDialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Ticket as Resolved</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide resolution notes (optional). This will mark the ticket as resolved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Enter resolution notes..."
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolve}
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                'Mark as Resolved'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

