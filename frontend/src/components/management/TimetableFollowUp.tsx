import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { Venue } from '../../types';
import { Field } from '../ui/Field';
import { api } from '../../services/api';
import { displayDate } from '../../i18n/translate';

export function TimetableFollowUp({ venue }: { venue: Venue }) {
  const { t, mutate } = useApp();
  const [method, setMethod] = useState('Phone');
  const [outcome, setOutcome] = useState('Times confirmed');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<
    { id: string; at: string; method: string; outcome: string; notes: string }[]
  >([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState('');
  const loadHistory = async (more = false) => {
    try {
      const result = await api<{ items: typeof history; nextCursor: string | null }>(
        '/management/venues/' +
          venue.id +
          '/follow-ups?limit=10' +
          (more && cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
      );
      setHistory((current) => (more ? [...current, ...result.items] : result.items));
      setCursor(result.nextCursor);
      setHistoryError('');
    } catch {
      setHistoryError(
        t(
          'Unable to load follow-up history. Try again.',
          'رابطے کا ریکارڈ نہیں کھل سکا۔ دوبارہ کوشش کریں۔',
        ),
      );
    }
  };
  return (
    <details>
      <summary>{t('Record a call or visit', 'کال یا ملاقات درج کریں')}</summary>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setSaved(false);
          try {
            await mutate('/management/venues/' + venue.id + '/follow-up', {
              revision: venue.revision,
              method,
              outcome,
              notes,
            });
            setNotes('');
            setSaved(true);
          } catch {
            /* Shared error message */
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label={t('Contact method', 'رابطے کا طریقہ')}>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="Phone">{t('Phone', 'فون')}</option>
            <option value="Visit">{t('Visit', 'ملاقات')}</option>
          </select>
        </Field>
        <Field label={t('Outcome', 'نتیجہ')}>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            {[
              ['Times confirmed', 'اوقات درست ہیں'],
              ['Correction requested', 'درستی کا کہا ہے'],
              ['No contact', 'رابطہ نہیں ہوا'],
              ['Replacement needed', 'نمائندہ بدلنا ضروری ہے'],
            ].map(([en, ur]) => (
              <option key={en} value={en}>
                {t(en, ur)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('Private contact notes', 'رابطے کی نجی تفصیل')}>
          <textarea
            required
            minLength={5}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <p>
          {t(
            'Record who you contacted and the next step. This does not reset the representative’s confirmation date.',
            'کس سے بات ہوئی اور اگلا قدم لکھیں۔ اس سے نمائندے کی تصدیق کی تاریخ نہیں بدلے گی۔',
          )}
        </p>
        <button disabled={busy}>
          {t('Save follow-up', 'رابطے کا ریکارڈ محفوظ کریں')}
        </button>
        {saved && (
          <p role="status">{t('Follow-up recorded', 'رابطے کا ریکارڈ محفوظ ہو گیا')}</p>
        )}
        <Link className="text-link" to={'/manage/assignments?venue=' + venue.id}>
          {t('Replace representative after checking', 'جانچ کے بعد نمائندہ تبدیل کریں')}
        </Link>
      </form>
      <button className="secondary spaced" onClick={() => void loadHistory()}>
        {t('View contact history', 'رابطوں کی سابقہ تفصیل')}
      </button>
      {historyError && <p role="alert">{historyError}</p>}
      {history.map((row) => (
        <div key={row.id} className="list-row">
          <div>
            <strong>
              {displayDate(row.at, true)} · {t(row.method)} · {t(row.outcome)}
            </strong>
            <p>{row.notes}</p>
          </div>
        </div>
      ))}
      {cursor && (
        <button className="secondary" onClick={() => void loadHistory(true)}>
          {t('More records', 'مزید ریکارڈ')}
        </button>
      )}
    </details>
  );
}
