/**
 * Shared service constants and types for both frontend and backend.
 * Eliminates magic strings by centralizing service identifiers and labels.
 */

export const SERVICE_IDS = {
  BUSINESS_PERMITS: 'business-permits',
  BUILDING_PERMITS: 'building-permits',
  OCCUPANCY_PERMITS: 'occupancy-permits',
  PROPERTY_TAXES: 'property-taxes',
  MARKET_FEES: 'market-fees',
  TRAFFIC_FINES: 'traffic-fines',
  TRUCK_PERMIT_FEES: 'truck-permit-fees',
  RENTAL_FEES: 'rental-fees',
} as const;

export type ServiceId = typeof SERVICE_IDS[keyof typeof SERVICE_IDS];


export interface ServiceDefinition {
  id: ServiceId;
  name: string;
  requiresApproval: boolean;
  subtypes?: readonly string[];
}

export const SERVICES: readonly ServiceDefinition[] = [
  { id: SERVICE_IDS.BUSINESS_PERMITS, name: 'Business Permits', requiresApproval: true },
  { id: SERVICE_IDS.BUILDING_PERMITS, name: 'Building Permits', requiresApproval: true },
  { id: SERVICE_IDS.OCCUPANCY_PERMITS, name: 'Occupancy Permits', requiresApproval: true },
  { id: SERVICE_IDS.PROPERTY_TAXES, name: 'Property Taxes', requiresApproval: false },
  { id: SERVICE_IDS.MARKET_FEES, name: 'Market Fees', requiresApproval: false },
  { id: SERVICE_IDS.TRAFFIC_FINES, name: 'Traffic Fines', requiresApproval: false },
  { id: SERVICE_IDS.TRUCK_PERMIT_FEES, name: 'Truck Permit Fees', requiresApproval: true },
  { id: SERVICE_IDS.RENTAL_FEES, name: 'Rental Fees', requiresApproval: false },
] as const;

export const SERVICE_NAME_BY_ID: Readonly<Record<ServiceId, string>> = SERVICES.reduce((acc, service) => {
  acc[service.id] = service.name;
  return acc;
}, {} as Record<ServiceId, string>);

export const isValidServiceId = (value: string): value is ServiceId => {
  return SERVICES.some((service) => service.id === value);
};

/**
 * Normalize free-text user input into a canonical ServiceId.
 * Accepts only current canonical IDs; legacy aliases are no longer supported.
 */
export const normalizeToServiceId = (raw: string): ServiceId | null => {
  const v = (raw || '').trim().toLowerCase().replace(/_/g, '-');
  return isValidServiceId(v) ? (v as ServiceId) : null;
};

/**
 * Build alias lists of ids and names for a set of service IDs.
 * Useful when matching queries against historical or user-entered values.
 */
export const getAliasesForServiceIds = (
  serviceIds: ReadonlyArray<string | ServiceId>
): { ids: string[]; names: string[] } => {
  const idSet: Set<string> = new Set();
  const nameSet: Set<string> = new Set();

  serviceIds.forEach((maybeId) => {
    const normalized = normalizeToServiceId(String(maybeId));
    if (!normalized) return;

    // Canonical id and name
    idSet.add(normalized);
    const canonicalName = SERVICE_NAME_BY_ID[normalized];
    if (canonicalName) nameSet.add(canonicalName);
  });

  return { ids: Array.from(idSet), names: Array.from(nameSet) };
};



/**
 * Static three-letter prefixes used for building human-friendly reference numbers per service.
 */
export const SERVICE_PREFIX_BY_ID: Readonly<Record<ServiceId, string>> = {
  [SERVICE_IDS.BUSINESS_PERMITS]: 'BSP',
  [SERVICE_IDS.BUILDING_PERMITS]: 'BLD',
  [SERVICE_IDS.OCCUPANCY_PERMITS]: 'OCC',
  [SERVICE_IDS.PROPERTY_TAXES]: 'PRT',
  [SERVICE_IDS.MARKET_FEES]: 'MKF',
  [SERVICE_IDS.TRAFFIC_FINES]: 'TRF',
  [SERVICE_IDS.TRUCK_PERMIT_FEES]: 'TPF',
  [SERVICE_IDS.RENTAL_FEES]: 'RNT',
} as const;

/**
 * Get the three-letter prefix for a given service id.
 */
export const getServicePrefix = (serviceId: ServiceId): string => {
  return SERVICE_PREFIX_BY_ID[serviceId] || 'GEN';
};

export interface BuildServiceReferenceInput {
  serviceId: ServiceId;
  /** Optional number of random digits to generate; defaults to 13 */
  length?: number;
}

/**
 * Build a reference string.
 * Example: BSP-1757007182522
 */
export const buildServiceReference = (input: BuildServiceReferenceInput): string => {
  const prefix = getServicePrefix(input.serviceId);
  const digits = generateRandomDigits(Math.max(6, Math.floor(input.length ?? 13)));
  return `${prefix}-${digits}`;
};

/**
 * Generate a string of numeric digits using WebCrypto when available, falling back to Math.random.
 */
export const generateRandomDigits = (length: number): string => {
  const n = Math.max(1, Math.floor(length));
  const result: number[] = [];
  const cryptoApi = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(n);
    cryptoApi.getRandomValues(bytes);
    for (let i = 0; i < n; i++) {
      // Map 0-255 uniformly to 0-9 by modulo; bias is negligible for references
      result.push(bytes[i] % 10);
    }
    return result.join('');
  }
  for (let i = 0; i < n; i++) {
    result.push(Math.floor(Math.random() * 10));
  }
  return result.join('');
};