import type { Notice } from '../types';
export function noticeState(n: Notice, now = Date.now()) {
  return n.state === 'Published' &&
    Date.parse(
      /(?:Z|[+-]\d{2}:\d{2})$/.test(n.expires) ? n.expires : n.expires + '+05:00',
    ) <= now
    ? 'Expired'
    : n.state;
}
