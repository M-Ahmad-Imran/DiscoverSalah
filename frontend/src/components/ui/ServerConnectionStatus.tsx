import { useSyncExternalStore } from 'react';
import { connectionSnapshot, subscribeConnection } from '../../services/serverConnection';
import { tr } from '../../i18n/translate';

export function ServerConnectionStatus() {
  const state = useSyncExternalStore(subscribeConnection, connectionSnapshot);
  if (state === 'idle') return null;
  return (
    <div className="server-connection-status" role="status" aria-live="polite">
      {tr(
        state === 'connecting'
          ? 'Connecting to the server. It may be waking up; please wait up to 90 seconds.'
          : 'The server is taking longer than expected. Check your connection and try again.',
      )}
    </div>
  );
}
