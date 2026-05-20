import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** Re-run callback when route changes or user returns to the browser tab. */
export default function useRouteRefresh(callback, extraDeps = []) {
  const { pathname, key } = useLocation();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    cbRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, key, ...extraDeps]);

  useEffect(() => {
    const reload = () => {
      if (document.visibilityState === 'visible') cbRef.current();
    };
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', reload);
    return () => {
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', reload);
    };
  }, [pathname, key]);
}
