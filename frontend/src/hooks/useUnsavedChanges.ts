import { useCallback, useEffect, useRef } from 'react';
import { useBlocker, type BlockerFunction } from 'react-router-dom';
/** Protect client-side links, browser Back and full-page navigation with one guard. */
export function useUnsavedChanges(dirty: boolean, safePath?: string) {
  const allow = useRef(false);
  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        dirty &&
        !allow.current &&
        currentLocation.pathname !== nextLocation.pathname &&
        nextLocation.pathname !== safePath,
      [dirty, safePath],
    ),
  );
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (
        window.confirm(
          'Leave this edited form? Unsaved changes may be lost. / فارم چھوڑ دیں؟ غیر محفوظ تبدیلیاں ضائع ہو سکتی ہیں۔',
        )
      )
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const handle = (event: BeforeUnloadEvent) => {
      if (dirty && !allow.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [dirty]);
  return () => {
    allow.current = true;
  };
}
