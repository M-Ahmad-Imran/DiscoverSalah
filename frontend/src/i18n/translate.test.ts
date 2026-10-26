import { describe, expect, it } from 'vitest';
import { noticeState } from '../domain/notices';
import { screenRequest } from '../services/screenRequest';
import type { Notice } from '../types';
import { errorMessage } from './errors';
import { displayDate, setTranslationLocale, translate } from './translate';

describe('Urdu display and pagination contracts', () => {
  it('translates display values without translating API enum values', () => {
    expect(translate('Published', 'ur')).not.toBe('Published');
    expect(translate('Asr proposed time', 'ur')).toBe('عصر کا مجوزہ وقت');
    expect(translate('Muhammad Ahmad', 'ur')).toBe('Muhammad Ahmad');
    const request = screenRequest(
      '/manage/mosques',
      '?status=Published&cursor=record-id',
    );
    expect(request.url).toContain('status=Published');
    expect(request.url).toContain('cursor=record-id');
  });
  it('uses explicit Urdu wording and localizes unknown server errors safely', () => {
    expect(translate('Name', 'ur', 'نام')).toBe('نام');
    setTranslationLocale('ur');
    expect(errorMessage('UNKNOWN', 'Internal English failure')).not.toContain('English');
    expect(displayDate('invalid')).toBe('—');
    setTranslationLocale('en');
  });
  it('handles both ISO and Pakistan-local notice expiry', () => {
    const notice = { state: 'Published', expires: '2000-01-01T00:00:00.000Z' } as Notice;
    expect(noticeState(notice)).toBe('Expired');
    expect(noticeState({ ...notice, expires: '2000-01-01T00:00' })).toBe('Expired');
    expect(noticeState({ ...notice, expires: '2099-01-01T00:00:00.000Z' })).toBe(
      'Published',
    );
  });
});
