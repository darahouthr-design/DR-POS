import { useEffect, useState } from 'react';

export function isDesktopDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return true;
  }
  const ua = navigator.userAgent || '';
  const isMobileOrTabletUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet|Kindle|Silk|PlayBook/i.test(
      ua
    ) ||
    (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);

  if (isMobileOrTabletUa) {
    return false;
  }

  return window.matchMedia('(min-width: 1024px)').matches;
}

export function useIsDesktopDevice(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopDevice());

  useEffect(() => {
    const update = () => setIsDesktop(isDesktopDevice());
    update();

    const mq = window.matchMedia('(min-width: 1024px)');
    mq.addEventListener?.('change', update);
    window.addEventListener('resize', update);

    return () => {
      mq.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return isDesktop;
}
