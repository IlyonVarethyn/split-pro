import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';

const TAB_ROUTES = ['/balances', '/groups', '/add', '/activity', '/account'];

type NavigationKind = 'tab' | 'push' | 'pop';

const path = (url: string) => url.split('?')[0]!.split('#')[0]!;
const hasQueryOrHash = (url: string) => url.includes('?') || url.includes('#');
const depth = (url: string) => path(url).split('/').filter(Boolean).length;

export const classifyNavigation = (from: string, to: string): NavigationKind => {
  if (
    !hasQueryOrHash(from) &&
    !hasQueryOrHash(to) &&
    TAB_ROUTES.includes(path(from)) &&
    TAB_ROUTES.includes(path(to))
  ) {
    return 'tab';
  }

  return depth(to) >= depth(from) ? 'push' : 'pop';
};

const ANIM_CLASS = {
  tab: 'screen-enter-tab',
  push: 'screen-enter-push',
  pop: 'screen-enter-pop',
} as const;

export const ScreenTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const prev = useRef(router.asPath);
  const [anim, setAnim] = useState<NavigationKind>('tab');

  useEffect(() => {
    const onDone = (url: string) => {
      setAnim(classifyNavigation(prev.current, url));
      prev.current = url;
    };

    router.events.on('routeChangeComplete', onDone);

    return () => router.events.off('routeChangeComplete', onDone);
  }, [router.events]);

  return (
    <div key={`${router.asPath}-${anim}`} className={ANIM_CLASS[anim]}>
      {children}
    </div>
  );
};
