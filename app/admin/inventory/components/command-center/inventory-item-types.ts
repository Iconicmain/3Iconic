export type InventoryItemTypeId =
  | 'router'
  | 'access_point'
  | 'bridge'
  | 'onu'
  | 'cable'
  | 'patch_cord'
  | 'splitter'
  | 'socket'
  | 'other';

export type ItemTracking = 'serialized' | 'bulk' | 'roll';

export interface InventoryItemTypeConfig {
  id: InventoryItemTypeId;
  label: string;
  category: string;
  unitType: 'pcs' | 'm';
  tracking: ItemTracking;
  namePlaceholder: string;
  codePrefix: string;
  rollIdPrefix?: string;
  defaultMetersPerRoll?: number;
}

export const INVENTORY_ITEM_TYPES: InventoryItemTypeConfig[] = [
  {
    id: 'router',
    label: 'Router',
    category: 'Equipment',
    unitType: 'pcs',
    tracking: 'serialized',
    namePlaceholder: 'e.g. MikroTik hAP ac2',
    codePrefix: 'RTR',
  },
  {
    id: 'access_point',
    label: 'Access Point',
    category: 'Equipment',
    unitType: 'pcs',
    tracking: 'serialized',
    namePlaceholder: 'e.g. Ubiquiti U6-LR',
    codePrefix: 'AP',
  },
  {
    id: 'bridge',
    label: 'Bridge',
    category: 'Equipment',
    unitType: 'pcs',
    tracking: 'serialized',
    namePlaceholder: 'e.g. NanoStation M5',
    codePrefix: 'BRG',
  },
  {
    id: 'onu',
    label: 'ONU',
    category: 'Equipment',
    unitType: 'pcs',
    tracking: 'serialized',
    namePlaceholder: 'e.g. Huawei HG8245H',
    codePrefix: 'ONU',
  },
  {
    id: 'cable',
    label: 'Cable (roll)',
    category: 'Drop Cable',
    unitType: 'm',
    tracking: 'roll',
    namePlaceholder: 'e.g. Drop Cable, Fiber Cable',
    codePrefix: 'CBL',
    rollIdPrefix: 'DC',
    defaultMetersPerRoll: 1000,
  },
  {
    id: 'patch_cord',
    label: 'Patch Cord',
    category: 'Materials',
    unitType: 'pcs',
    tracking: 'bulk',
    namePlaceholder: 'e.g. Patch Cord Cat6 1m',
    codePrefix: 'PATCH',
  },
  {
    id: 'splitter',
    label: 'Splitter',
    category: 'Materials',
    unitType: 'pcs',
    tracking: 'bulk',
    namePlaceholder: 'Pick a size below or enter custom',
    codePrefix: 'SPL',
  },
  {
    id: 'socket',
    label: 'Socket',
    category: 'Accessories',
    unitType: 'pcs',
    tracking: 'bulk',
    namePlaceholder: 'e.g. RJ45 Wall Socket',
    codePrefix: 'SOC',
  },
  {
    id: 'other',
    label: 'Other',
    category: 'Other',
    unitType: 'pcs',
    tracking: 'bulk',
    namePlaceholder: 'e.g. Cable clamp, tool',
    codePrefix: 'ITEM',
  },
];

export interface SplitterPreset {
  id: string;
  label: string;
  itemName: string;
  itemCode: string;
}

/** Common fiber splitter ratios — tap to auto-fill name & code */
export const SPLITTER_PRESETS: SplitterPreset[] = [
  { id: '1x2', label: '1 × 2', itemName: '1×2 Splitter', itemCode: 'SPL-1X2' },
  { id: '1x4', label: '1 × 4', itemName: '1×4 Splitter', itemCode: 'SPL-1X4' },
  { id: '1x8', label: '1 × 8', itemName: '1×8 Splitter', itemCode: 'SPL-1X8' },
  { id: '1x16', label: '1 × 16', itemName: '1×16 Splitter', itemCode: 'SPL-1X16' },
  { id: '1x32', label: '1 × 32', itemName: '1×32 Splitter', itemCode: 'SPL-1X32' },
  { id: 'custom', label: 'Other', itemName: '', itemCode: '' },
];

export function inferSplitterPresetId(itemName?: string): string {
  if (!itemName) return '1x8';
  const n = itemName.toLowerCase().replace(/\s+/g, '');
  for (const p of SPLITTER_PRESETS) {
    if (p.id === 'custom') continue;
    if (n.includes(p.id)) return p.id;
  }
  return 'custom';
}

export function getSplitterPreset(id: string): SplitterPreset | undefined {
  return SPLITTER_PRESETS.find((p) => p.id === id);
}

export function getItemTypeConfig(id: InventoryItemTypeId): InventoryItemTypeConfig {
  return INVENTORY_ITEM_TYPES.find((t) => t.id === id) || INVENTORY_ITEM_TYPES[INVENTORY_ITEM_TYPES.length - 1];
}

export function inferItemTypeFromItem(item: {
  isCable?: boolean;
  unitType?: string;
  category?: string;
  itemName?: string;
}): InventoryItemTypeId {
  if (item.isCable || item.unitType === 'meters' || item.unitType === 'm') return 'cable';
  const name = (item.itemName || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  if (name.includes('router') || cat === 'routers') return 'router';
  if (name.includes('access point') || name.includes('ap ')) return 'access_point';
  if (name.includes('bridge')) return 'bridge';
  if (name.includes('onu')) return 'onu';
  if (name.includes('patch')) return 'patch_cord';
  if (name.includes('splitter')) return 'splitter';
  if (name.includes('socket')) return 'socket';
  return 'other';
}

export function slugItemCode(name: string, prefix: string): string {
  const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return slug ? `${prefix}-${slug}` : prefix;
}

export function parseIdLines(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Formats hex input into standard MAC form, e.g. AABBCCDDEE01 → AA:BB:CC:DD:EE:01 */
export function formatMacAddress(input: string): string {
  const hex = input.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 12);
  if (!hex) return '';
  const parts: string[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    parts.push(hex.slice(i, i + 2));
  }
  return parts.join(':');
}

/** Formats each line of a textarea as a MAC address (preserves line breaks). */
export function formatMacLinesText(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      return formatMacAddress(trimmed);
    })
    .join('\n');
}
