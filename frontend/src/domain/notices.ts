import type { Notice } from '../types';
export function noticeState(n: Notice, now = Date.now()) {
  return n.state === 'Published' && Date.parse(n.expires + '+05:00') <= now
    ? 'Expired'
    : n.state;
}
