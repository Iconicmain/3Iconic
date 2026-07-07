/** Shared station / issue type helpers */

export type IssueType =
  | 'TECHNICIAN_ONLY'
  | 'SINGLE_STATION'
  | 'SHARED_STATIONS'
  | 'PROJECT';

export const ISSUE_TYPE_OPTIONS: { value: IssueType; label: string; description: string }[] = [
  { value: 'TECHNICIAN_ONLY', label: 'Technician only', description: 'Track by technician — no station grouping' },
  { value: 'SINGLE_STATION', label: 'Single station', description: 'Standard issue from one station' },
  { value: 'SHARED_STATIONS', label: 'Shared stations', description: 'Equipment used across co-located stations' },
  { value: 'PROJECT', label: 'Project / customer', description: 'Tied to a job or customer reference' },
];

export function issueTypeLabel(t?: string | null): string {
  return ISSUE_TYPE_OPTIONS.find((o) => o.value === t)?.label || 'Single station';
}

/** Mongo filter: issues/logs visible when viewing a station */
export function stationVisibilityFilter(stationId: string): Record<string, unknown> {
  return {
    $or: [
      { stationId },
      { sourceStationId: stationId },
      { primaryStationId: stationId },
      { sharedStationIds: stationId },
    ],
  };
}

export function normalizeIssuePayload(body: {
  stationId?: string;
  sourceStationId?: string;
  primaryStationId?: string;
  issueType?: string;
  sharedStationIds?: string[];
  projectCustomer?: string;
  jobReference?: string;
}) {
  const issueType = (body.issueType as IssueType) || 'SINGLE_STATION';
  const sourceStationId = body.sourceStationId || body.stationId || '';
  const primaryStationId = body.primaryStationId || sourceStationId;
  const sharedStationIds = Array.isArray(body.sharedStationIds)
    ? [...new Set(body.sharedStationIds.filter(Boolean))]
    : [];
  const projectCustomer = body.projectCustomer?.trim() || body.jobReference?.trim() || null;

  return { issueType, sourceStationId, primaryStationId, sharedStationIds, projectCustomer };
}

export function allowedReturnStationIds(issue: {
  stationId?: string;
  sourceStationId?: string;
  primaryStationId?: string;
  sharedStationIds?: string[];
}): string[] {
  const ids = [
    issue.sourceStationId,
    issue.primaryStationId,
    issue.stationId,
    ...(issue.sharedStationIds || []),
  ].filter(Boolean) as string[];
  return [...new Set(ids)];
}

export function sharedStationsLabel(
  issue: { primaryStationId?: string; sharedStationIds?: string[] },
  nameMap: Map<string, string>
): string | null {
  if (!issue.sharedStationIds?.length) return null;
  const primary = nameMap.get(issue.primaryStationId || '') || issue.primaryStationId;
  const shared = issue.sharedStationIds
    .map((id) => nameMap.get(id) || id)
    .join(' + ');
  return primary ? `${primary} + ${shared}` : shared;
}
