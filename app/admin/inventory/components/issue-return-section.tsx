'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpCircle, ArrowDownCircle, Plus, Share2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { IssueEquipmentDialog } from './command-center/issue-equipment-dialog';
import { issueTypeLabel } from '@/lib/isp/issue-types';
import { softBadgeClass } from './command-center/inventory-colors';
import { groupByDay } from './command-center/inventory-day-groups';
import { DayGroupedSections } from './command-center/day-grouped-list';

interface SerializedUnit {
  id: string;
  serialNumber?: string | null;
  macAddress?: string | null;
  status?: string;
  label?: string;
}

interface RouterUnitOption {
  id: string;
  serialNumber?: string | null;
  macAddress?: string | null;
  status: string;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface IssueItem {
  id: string;
  itemId: string;
  itemName?: string;
  quantityTaken: number;
  quantityReturned: number;
  quantityUsed: number;
  unitType: string;
  routerUnitIds?: string[];
  serializedUnits?: SerializedUnit[];
  timeOut?: string | null;
  returnTime?: string | null;
  returnCondition?: string | null;
}

interface Issue {
  id: string;
  technicianId: string;
  technicianName?: string;
  jobReference?: string;
  issueType?: string;
  sourceStationId?: string;
  sourceStationName?: string;
  primaryStationId?: string;
  primaryStationName?: string;
  sharedStationIds?: string[];
  sharedStationNames?: string[];
  projectCustomer?: string;
  expectedReturnDate?: string | null;
  status: string;
  issueDate: string;
  items: IssueItem[];
}

function fmtDateTime(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function unitsStillOut(item: IssueItem): SerializedUnit[] {
  if (!item.serializedUnits?.length) return [];
  return item.serializedUnits.filter((u) => u.status === 'issued');
}

function formatUnitList(units: SerializedUnit[]): string {
  return units.map((u) => u.label || u.serialNumber || u.macAddress || u.id).join(', ');
}

function daysOut(from?: string | null): number {
  if (!from) return 0;
  const start = new Date(from).getTime();
  if (isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
}

function sharedForLabel(issue: Issue): string | null {
  if (issue.issueType !== 'SHARED_STATIONS') return null;
  const primary = issue.primaryStationName || issue.primaryStationId;
  const shared = issue.sharedStationNames?.length
    ? issue.sharedStationNames.join(', ')
    : issue.sharedStationIds?.join(', ');
  if (primary && shared) return `${primary} + ${shared}`;
  return primary || shared || null;
}

function isOverdue(issue: Issue, item: IssueItem): boolean {
  if (issue.expectedReturnDate) {
    return new Date(issue.expectedReturnDate).getTime() < Date.now();
  }
  return daysOut(item.timeOut || issue.issueDate) >= 3;
}

interface IssueReturnSectionProps {
  stationId: string;
  stations?: { id: string; stationName: string }[];
  onRefresh: () => void;
  refreshKey?: number;
  hideHeader?: boolean;
  mode?: 'issue' | 'return' | 'all';
  openDialog?: 'issue' | 'return' | null;
  onOpenDialogHandled?: () => void;
}

export function IssueReturnSection({
  stationId,
  stations = [],
  onRefresh,
  refreshKey = 0,
  hideHeader = false,
  mode = 'all',
  openDialog = null,
  onOpenDialogHandled,
}: IssueReturnSectionProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedIssueItem, setSelectedIssueItem] = useState<{ issue: Issue; item: IssueItem } | null>(null);
  const [returnQty, setReturnQty] = useState('');
  const [returnCondition, setReturnCondition] = useState('');
  const [returnUnitIds, setReturnUnitIds] = useState<string[]>([]);
  const [returnStationId, setReturnStationId] = useState('');

  const unitLabel = (u: RouterUnitOption | SerializedUnit) =>
    u.serialNumber || u.macAddress || u.id;

  const stationOptions = stations.length > 0 ? stations : [{ id: stationId, stationName: stationId }];

  const allowedReturnStations = (issue: Issue) => {
    const ids = new Set<string>();
    if (issue.sourceStationId) ids.add(issue.sourceStationId);
    if (issue.stationId) ids.add(issue.stationId);
    if (issue.primaryStationId) ids.add(issue.primaryStationId);
    for (const sid of issue.sharedStationIds || []) ids.add(sid);
    return [...ids].map((id) => ({
      id,
      name:
        stations.find((s) => s.id === id)?.stationName ||
        (id === issue.sourceStationId ? issue.sourceStationName : undefined) ||
        (id === issue.primaryStationId ? issue.primaryStationName : undefined) ||
        id,
    }));
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/isp/technician-issues?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/isp/technicians?stationId=${stationId}`, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([issuesRes, techRes]) => {
        setIssues(issuesRes.issues || []);
        setTechnicians(techRes.technicians || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const ledgerRows = useMemo(
    () =>
      issues
        .flatMap((issue) => issue.items.map((item) => ({ issue, item })))
        .sort(
          (a, b) =>
            new Date(b.item.timeOut || b.issue.issueDate).getTime() -
            new Date(a.item.timeOut || a.issue.issueDate).getTime()
        ),
    [issues]
  );

  const issueLedgerByDay = useMemo(
    () => groupByDay(ledgerRows, (row) => row.item.timeOut || row.issue.issueDate),
    [ledgerRows]
  );

  const pendingItems = useMemo(
    () =>
      issues.flatMap((issue) =>
        issue.items
          .filter((i) => i.quantityReturned < i.quantityTaken)
          .map((item) => ({ issue, item }))
      ),
    [issues]
  );

  const pendingByDay = useMemo(
    () => groupByDay(pendingItems, (row) => row.item.timeOut || row.issue.issueDate),
    [pendingItems]
  );

  const returnedItems = useMemo(
    () =>
      issues
        .flatMap((issue) =>
          issue.items
            .filter((i) => i.quantityReturned > 0)
            .map((item) => ({ issue, item }))
        )
        .sort(
          (a, b) =>
            new Date(b.item.returnTime || 0).getTime() - new Date(a.item.returnTime || 0).getTime()
        ),
    [issues]
  );

  const returnedByDay = useMemo(
    () => groupByDay(returnedItems, (row) => row.item.returnTime || row.issue.issueDate),
    [returnedItems]
  );

  useEffect(() => {
    loadData();
  }, [stationId, refreshKey]);

  useEffect(() => {
    if (!openDialog) return;
    if (openDialog === 'issue') setIssueOpen(true);
    if (openDialog === 'return') setReturnOpen(true);
    onOpenDialogHandled?.();
  }, [openDialog, onOpenDialogHandled]);

  const openReturnDialog = (issue: Issue, item: IssueItem) => {
    setSelectedIssueItem({ issue, item });
    setReturnQty(String(item.quantityTaken - item.quantityReturned));
    setReturnUnitIds([]);
    setReturnCondition('');
    setReturnStationId(issue.sourceStationId || issue.stationId);
    setReturnOpen(true);
  };

  const handleReturn = () => {
    if (!selectedIssueItem) return;
    const hasSerialized = (selectedIssueItem.item.serializedUnits?.length || 0) > 0;

    if (hasSerialized) {
      if (returnUnitIds.length === 0) {
        toast.error('Select which units are being returned');
        return;
      }
      fetch('/api/isp/technician-issues/return', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueItemId: selectedIssueItem.item.id,
          quantityReturned: returnUnitIds.length,
          routerUnitIds: returnUnitIds,
          returnCondition: returnCondition || undefined,
          returnStationId: returnStationId || undefined,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.error) throw new Error(d.error);
          toast.success(`Returned ${returnUnitIds.length} unit(s)`);
          setReturnOpen(false);
          setSelectedIssueItem(null);
          setReturnUnitIds([]);
          setReturnCondition('');
          loadData();
          onRefresh();
        })
        .catch((e) => toast.error(e.message));
      return;
    }

    const qty = parseFloat(returnQty);
    if (isNaN(qty) || qty < 0) {
      toast.error('Enter valid quantity');
      return;
    }
    if (qty > selectedIssueItem.item.quantityTaken - selectedIssueItem.item.quantityReturned) {
      toast.error('Cannot return more than taken');
      return;
    }
    fetch('/api/isp/technician-issues/return', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issueItemId: selectedIssueItem.item.id,
        quantityReturned: qty,
        returnCondition: returnCondition || undefined,
        returnStationId: returnStationId || undefined,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        toast.success('Return recorded');
        setReturnOpen(false);
        setSelectedIssueItem(null);
        setReturnQty('');
        setReturnCondition('');
        loadData();
        onRefresh();
      })
      .catch((e) => toast.error(e.message));
  };

  const showIssue = mode === 'all' || mode === 'issue';
  const showReturn = mode === 'all' || mode === 'return';

  return (
    <>
      <Card>
        {!hideHeader && showReturn && mode === 'return' && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 shrink-0" />
            Equipment Returns
          </CardTitle>
        </CardHeader>
        )}
        {!hideHeader && showIssue && (
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 shrink-0" />
            {mode === 'issue' ? 'Issue Equipment' : 'Daily Issue / Return'}
          </CardTitle>
          <Button size="sm" onClick={() => setIssueOpen(true)} className="w-full sm:w-auto h-9">
            <Plus className="h-4 w-4 mr-1" />
            Issue Items
          </Button>
        </CardHeader>
        )}
        <CardContent>
          {loading ? (
            <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <div className="space-y-4">
              {showIssue && mode === 'issue' && (
                <>
                <p className="text-sm text-muted-foreground">
                  Issue to a technician — use <strong>Shared stations</strong> when equipment serves co-located sites. Stock always deducts from the source station.
                </p>
                {ledgerRows.length > 0 && (
                  <DayGroupedSections
                    groups={issueLedgerByDay}
                    renderItems={(rows) => (
                      <div className="rounded-lg border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>From</TableHead>
                              <TableHead>For / Shared</TableHead>
                              <TableHead>Technician</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map(({ issue, item }) => {
                              const shared = sharedForLabel(issue);
                              return (
                                <TableRow key={`${issue.id}-${item.id}`}>
                                  <TableCell>
                                    <span className={softBadgeClass(
                                      issue.issueType === 'SHARED_STATIONS'
                                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                        : 'bg-blue-100 text-blue-800 border-blue-200'
                                    )}>
                                      {issueTypeLabel(issue.issueType)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="font-medium">{item.itemName || item.itemId}</TableCell>
                                  <TableCell>{item.quantityTaken} {item.unitType}</TableCell>
                                  <TableCell className="text-sm">{issue.sourceStationName || issue.sourceStationId || issue.stationId}</TableCell>
                                  <TableCell className="text-sm max-w-[160px] truncate" title={shared || undefined}>
                                    {shared ? (
                                      <span className="inline-flex items-center gap-1">
                                        <Share2 className="h-3 w-3 text-indigo-600 shrink-0" />
                                        {shared}
                                      </span>
                                    ) : (
                                      issue.projectCustomer || issue.jobReference || '—'
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">{issue.technicianName || issue.technicianId}</TableCell>
                                  <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(item.timeOut || issue.issueDate)}</TableCell>
                                  <TableCell>
                                    <Badge variant={issue.status === 'CLOSED' ? 'secondary' : 'default'}>{issue.status}</Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  />
                )}
                </>
              )}
              {showReturn && (
              <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReturnOpen(true)}
                  disabled={pendingItems.length === 0}
                >
                  Process Return
                </Button>
              </div>
              {pendingItems.length > 0 ? (
                <>
                  <div className="md:hidden">
                    <DayGroupedSections
                      groups={pendingByDay}
                      renderItems={(items) => (
                        <div className="space-y-3">
                          {items.map(({ issue, item }) => {
                            const days = daysOut(item.timeOut || issue.issueDate);
                            const overdue = isOverdue(issue, item);
                            const shared = sharedForLabel(issue);
                            return (
                              <div key={item.id} className="rounded-lg border p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium">{item.itemName || item.itemId}</p>
                                    <p className="text-xs text-muted-foreground">{issue.technicianName || issue.technicianId}</p>
                                    {shared && (
                                      <p className="text-[11px] text-indigo-700 flex items-center gap-1 mt-0.5">
                                        <Share2 className="h-3 w-3" /> {shared}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant={overdue ? 'destructive' : item.quantityReturned > 0 ? 'secondary' : 'default'}>
                                    {overdue ? 'Overdue' : item.quantityReturned > 0 ? 'Partial' : 'Pending'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                  <p>From: {issue.sourceStationName || issue.stationId}</p>
                                  <p>Picked up: {fmtDateTime(item.timeOut || issue.issueDate)}</p>
                                  {issue.expectedReturnDate && (
                                    <p>Expected: {fmtDateTime(issue.expectedReturnDate)}</p>
                                  )}
                                  <p>Out: {item.quantityTaken - item.quantityReturned} {item.unitType} · {days} day{days === 1 ? '' : 's'}</p>
                                  {unitsStillOut(item).length > 0 && (
                                    <p className="font-mono text-[11px] break-all">
                                      Units: {formatUnitList(unitsStillOut(item))}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => openReturnDialog(issue, item)}
                                >
                                  Return
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    />
                  </div>
                  <div className="hidden md:block">
                    <DayGroupedSections
                      groups={pendingByDay}
                      renderItems={(items) => (
                        <div className="overflow-x-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Technician</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Out</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>Shared</TableHead>
                                <TableHead>Picked Up</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map(({ issue, item }) => {
                                const overdue = isOverdue(issue, item);
                                const shared = sharedForLabel(issue);
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">{issue.technicianName || issue.technicianId}</TableCell>
                                    <TableCell>
                                      <p>{item.itemName || item.itemId}</p>
                                      {unitsStillOut(item).length > 0 && (
                                        <p className="text-xs font-mono text-muted-foreground mt-0.5 max-w-[200px] truncate" title={formatUnitList(unitsStillOut(item))}>
                                          {formatUnitList(unitsStillOut(item))}
                                        </p>
                                      )}
                                    </TableCell>
                                    <TableCell>{item.quantityTaken - item.quantityReturned} {item.unitType}</TableCell>
                                    <TableCell className="text-sm">{issue.sourceStationName || issue.stationId}</TableCell>
                                    <TableCell className="text-xs text-indigo-700 max-w-[140px] truncate" title={shared || undefined}>
                                      {shared || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(item.timeOut || issue.issueDate)}</TableCell>
                                    <TableCell>
                                      <Badge variant={overdue ? 'destructive' : item.quantityReturned > 0 ? 'secondary' : 'default'}>
                                        {overdue ? 'Overdue' : item.quantityReturned > 0 ? 'Partial' : 'Pending'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="sm" onClick={() => openReturnDialog(issue, item)}>
                                        Return
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No pending returns. Issue items to technicians to get started.
                </p>
              )}

              {returnedItems.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4" />
                    Recent Returns
                  </p>
                  <div className="hidden md:block">
                    <DayGroupedSections
                      groups={returnedByDay}
                      renderItems={(items) => (
                        <div className="overflow-x-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Technician</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Returned</TableHead>
                                <TableHead>Picked Up</TableHead>
                                <TableHead>Dropped Off</TableHead>
                                <TableHead>Condition</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map(({ issue, item }) => (
                                <TableRow key={`ret-${item.id}`}>
                                  <TableCell>{issue.technicianName || issue.technicianId}</TableCell>
                                  <TableCell>{item.itemName || item.itemId}</TableCell>
                                  <TableCell>{item.quantityReturned} {item.unitType}</TableCell>
                                  <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(item.timeOut || issue.issueDate)}</TableCell>
                                  <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(item.returnTime)}</TableCell>
                                  <TableCell>
                                    {item.returnCondition ? (
                                      <Badge variant={item.returnCondition === 'Damaged' || item.returnCondition === 'Lost' ? 'destructive' : 'secondary'}>
                                        {item.returnCondition}
                                      </Badge>
                                    ) : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    />
                  </div>
                  <div className="md:hidden">
                    <DayGroupedSections
                      groups={returnedByDay}
                      renderItems={(items) => (
                        <div className="space-y-2">
                          {items.map(({ issue, item }) => (
                            <div key={`ret-m-${item.id}`} className="rounded-lg border p-3 text-sm space-y-1">
                              <div className="flex justify-between gap-2">
                                <p className="font-medium">{item.itemName || item.itemId}</p>
                                {item.returnCondition && (
                                  <Badge variant={item.returnCondition === 'Damaged' || item.returnCondition === 'Lost' ? 'destructive' : 'secondary'}>
                                    {item.returnCondition}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{issue.technicianName || issue.technicianId} · {item.quantityReturned} {item.unitType}</p>
                              <p className="text-xs text-muted-foreground">Out: {fmtDateTime(item.timeOut || issue.issueDate)}</p>
                              <p className="text-xs text-muted-foreground">In: {fmtDateTime(item.returnTime)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showIssue && (
        <IssueEquipmentDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          stationId={stationId}
          stations={stationOptions}
          technicians={technicians}
          onSuccess={() => {
            loadData();
            onRefresh();
          }}
        />
      )}

      {showReturn && (
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
          </DialogHeader>
          {selectedIssueItem && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p>
                  {selectedIssueItem.item.itemName || selectedIssueItem.item.itemId} — Max return:{' '}
                  {selectedIssueItem.item.quantityTaken - selectedIssueItem.item.quantityReturned}{' '}
                  {selectedIssueItem.item.unitType}
                </p>
                {sharedForLabel(selectedIssueItem.issue) && (
                  <p className="text-xs text-indigo-700 flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    Shared: {sharedForLabel(selectedIssueItem.issue)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  From {selectedIssueItem.issue.sourceStationName || selectedIssueItem.issue.stationId} · Picked up{' '}
                  {fmtDateTime(selectedIssueItem.item.timeOut || selectedIssueItem.issue.issueDate)} by{' '}
                  {selectedIssueItem.issue.technicianName || selectedIssueItem.issue.technicianId}. Drop-off time is recorded automatically when you save.
                </p>
              </div>
              {unitsStillOut(selectedIssueItem.item).length > 0 ? (
                <div className="space-y-2">
                  <Label>Select units being returned (serial / MAC)</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border p-2">
                    {unitsStillOut(selectedIssueItem.item).map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={returnUnitIds.includes(u.id)}
                          onCheckedChange={(c) =>
                            setReturnUnitIds((prev) =>
                              c ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                            )
                          }
                        />
                        <span className="font-mono text-xs">{unitLabel(u)}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{returnUnitIds.length} unit(s) selected</p>
                </div>
              ) : (
              <div>
                <Label>Quantity Returned</Label>
                <Input
                  type="number"
                  min="0"
                  max={selectedIssueItem.item.quantityTaken - selectedIssueItem.item.quantityReturned}
                  value={returnQty}
                  onChange={(e) => setReturnQty(e.target.value)}
                />
              </div>
              )}
              <div>
                <Label>Return to station</Label>
                <Select value={returnStationId} onValueChange={setReturnStationId}>
                  <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                  <SelectContent>
                    {allowedReturnStations(selectedIssueItem.issue).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Defaults to source station · change if item returns elsewhere
                </p>
              </div>
              <div>
                <Label>Return condition</Label>
                <Select value={returnCondition} onValueChange={setReturnCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Returned good condition</SelectItem>
                    <SelectItem value="Damaged">Returned damaged</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                    <SelectItem value="Repair">Send to repair</SelectItem>
                    <SelectItem value="Partial">Partial return</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={handleReturn}>Record Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </>
  );
}
