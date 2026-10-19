import { SpecialSession, Times } from './index';

export interface Draft {
  venueId: string;
  times: Times;
  special: SpecialSession[];
  effective: string;
  reason: string;
  baseRevision: number;
}
