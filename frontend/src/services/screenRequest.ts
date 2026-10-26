import { today } from '../utils/date';
import { getOrigin } from './origin';
export function screenRequest(path: string, search: string) {
  const source = new URLSearchParams(search);
  const q = new URLSearchParams();
  const protectedView = path.startsWith('/manage');
  const parts = path.split('/').filter(Boolean);
  let view = 'none',
    id = '',
    kind = '';
  if (!protectedView) {
    if (['/', '/results', '/map'].includes(path)) view = 'discovery';
    if (parts[0] === 'mosque') {
      view = 'venue';
      id = parts[1];
    }
    if (parts[0] === 'notice') {
      view = 'notice';
      id = parts[1];
    }
    if (path === '/notices') view = 'notices';
    if (path === '/coverage') view = 'areas';
    if (['/apply', '/report', '/suggest', '/contact', '/location'].includes(path))
      view = 'form';
  } else {
    const section = parts[1] || '';
    const list: Record<string, string> = {
      '': 'dashboard',
      mosques: 'venues',
      submissions: 'proposals',
      reviews: 'reviews',
      reports: 'requests',
      suggestions: 'requests',
      applications: 'requests',
      registrations: 'registrations',
      'contact-changes': 'changes',
      'profile-changes': 'changes',
      notices: 'notices',
      accounts: 'accounts',
      representatives: 'accounts',
      areas: 'areas',
      history: 'audit',
      notifications: 'notifications',
      delivery: 'delivery',
      maintenance: 'venues',
      escalations: 'reviews',
      assignments: 'form',
      duplicates: 'form',
      register: 'form',
      account: 'account',
    };
    view = list[section] || 'none';
    const kinds: Record<string, string> = {
      reports: 'report',
      suggestions: 'suggestion',
      applications: 'application',
      'contact-changes': 'contact-change',
      'profile-changes': 'profile-change',
    };
    kind = kinds[section] || '';
    if (parts[2]) {
      id = parts[2];
      if (section === 'mosques' || section === 'registrations') view = 'venue';
      if (section === 'submissions' || section === 'review') view = 'proposal';
      if (section === 'requests') view = 'request';
      if (section === 'accounts') view = id === 'invite' ? 'form' : 'account';
      if (section === 'notices') view = id === 'new' ? 'form' : 'notice';
      if (['invite', 'new'].includes(id)) id = '';
    }
    if (section === 'escalations') kind = 'escalation';
    if (section === 'representatives') q.set('role', 'representative');
  }
  for (const key of [
    'cursor',
    'limit',
    'q',
    'status',
    'role',
    'venue',
    'from',
    'to',
    'person',
    'due',
    'urgent',
    'area',
    'city',
  ]) {
    const value = source.get(key);
    if (value && value !== 'All') q.set(key, value);
  }
  if (view === 'reviews' && source.get('type') && source.get('type') !== 'All')
    kind = source.get('type')!;
  if (view === 'notices' && source.get('notice')) id = source.get('notice')!;
  q.set('view', view);
  if (id) q.set('id', id);
  if (kind) q.set('kind', kind);
  q.set('date', source.get('date') || today());
  if (view === 'discovery') {
    for (const [key, fallback] of [
      ['prayer', 'Asr'],
      ['scope', 'city'],
      ['sort', 'time'],
      ['radius', '5'],
    ])
      q.set(key, source.get(key) || fallback);
    const origin = getOrigin();
    if (origin && q.get('scope') === 'nearby') {
      q.set('lat', String(origin.lat));
      q.set('lng', String(origin.lng));
    }
  }
  return {
    url: (protectedView ? '/management/workspace?' : '/catalog?') + q,
    view,
    protectedView,
  };
}
