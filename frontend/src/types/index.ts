export type Role = 'representative' | 'focal' | 'admin';

export type Prayer = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Jumu’ah' | 'Eid';

export type Times = Record<string, string>;

export interface SpecialSession {
  id: string;
  prayer: string;
  date: string;
  time: string;
  khutbah: string;
  provisional: boolean;
  canceled: boolean;
}

export interface Venue {
  registrationRelationship?: string;
  city?: string;
  initialEffective?: string;
  pendingScopes?: {
    effective: string;
    prayers: string[];
    dated: { prayer: string; date: string }[];
  }[];
  areaId?: string;
  contactName?: string;
  contactNumber?: string;
  kind?: 'Mosque' | 'Prayer ground';
  parentVenueId?: string;
  duplicateOf?: string;
  disputes?: {
    id: string;
    prayer: string;
    date: string;
    reason: string;
    reportId: string;
    recordedBy: string;
    resolved?: boolean;
  }[];
  id: string;
  name: string;
  urdu: string;
  area: string;
  address: string;
  distance: number;
  lat: number;
  lng: number;
  status: string;
  times: Times;
  special: SpecialSession[];
  rep: string;
  focal: string;
  revision: number;
  reconfirmed: string;
  phoneVerified: string;
  facilities: Record<string, string>;
  image: number;
  backup?: {
    reviewer: string;
    startsAt: string;
    endsAt: string;
    reason: string;
    assignedBy: string;
  };
}

export interface Proposal {
  id: string;
  venueId: string;
  version: number;
  baseRevision: number;
  author: string;
  state: string;
  times: Times;
  before: Times;
  special: SpecialSession[];
  effective: string;
  reason: string;
  created: string;
  decision?: string;
  reviewer?: string;
  escalated?: boolean;
  beforeSpecial?: SpecialSession[];
  callAttempts?: { outcome: string; person: string; calledAt: string; notes: string }[];
  evidence?: { outcome: string; person: string; calledAt: string; notes: string };
}

export interface RequestRecord {
  revision?: number;
  id: string;
  token: string;
  kind: string;
  title: string;
  status: string;
  values: Record<string, string>;
  created: string;
  response?: string;
  internalNotes?: string;
  assessment?: { checks: string[]; reviewer: string; at: string };
}

export interface Notice {
  revision?: number;
  replacesId?: string;
  id: string;
  venueId: string;
  title: string;
  body: string;
  category: string;
  event: string;
  expires: string;
  state: string;
  source: string;
  author: string;
}

export interface Account {
  areaIds?: string[];
  authVersion?: number;
  contactConfirmedAt?: string;
  contactNumber?: string;
  contactVerifiedAt?: string;
  id: string;
  name: string;
  role: Role;
  area: string;
  active: boolean;
  status: string;
}

export interface Notification {
  id: string;
  title: string;
  href: string;
  role: Role;
  read: boolean;
}

export interface Audit {
  id: string;
  action: string;
  actor: string;
  at: string;
  target: string;
}

export interface DeliveryJob {
  id: string;
  target: string;
  state: 'Failed' | 'Retry queued' | 'Escalated';
  error: string;
  attempts: number;
  history: string[];
}
export interface Database {
  page?: {
    view: string;
    ids: string[];
    nextCursor: string | null;
    size: number;
    hasPrevious: boolean;
  };
  counts?: Record<string, number>;
  discoverySessions?: (SpecialSession & { venueId: string })[];
  deliveryJobs?: DeliveryJob[];
  venues: Venue[];
  proposals: Proposal[];
  requests: RequestRecord[];
  notices: Notice[];
  accounts: Account[];
  notifications: Notification[];
  audit: Audit[];
  areas: {
    venueCount?: number;
    id?: string;
    revision?: number;
    name: string;
    city: string;
    focal: string;
  }[];
}
