import { useEffect, useMemo, useState } from 'react';
import { FormieLogo, VerbbLogo } from './components/Branding';
import { GraphqlRoute } from './routes/GraphqlRoute';
import { RestRoute } from './routes/RestRoute';
import { stripAppBasePath, toAppHref } from './lib/routing';

type ModeId = 'server-rendered' | 'client-rendered';
type TransportId = 'rest' | 'graphql';
type BrowserLocationState = {
  pathname: string;
  search: string;
};

const NAV_ITEMS: Array<{
  mode: ModeId;
  transport: TransportId;
  title: string;
  href: string;
}> = [
    {
      mode: 'server-rendered',
      transport: 'rest',
      title: 'REST',
      href: '/server-rendered/rest?example=single-page&scenario=html-default-theme',
    },
    {
      mode: 'server-rendered',
      transport: 'graphql',
      title: 'GraphQL',
      href: '/server-rendered/graphql?example=single-page&demo=html-payload&scenario=html-default-theme',
    },
    {
      mode: 'client-rendered',
      transport: 'rest',
      title: 'REST',
      href: '/client-rendered/rest?example=single-page&scenario=component-rest-form',
    },
    {
      mode: 'client-rendered',
      transport: 'graphql',
      title: 'GraphQL',
      href: '/client-rendered/graphql?example=single-page&demo=component-payload',
    },
  ];

function readBrowserLocation(): BrowserLocationState {
  if (typeof window === 'undefined') {
    return {
      pathname: '/server-rendered/rest',
      search: '',
    };
  }

  return {
    pathname: stripAppBasePath(window.location.pathname || '/server-rendered/rest'),
    search: window.location.search,
  };
}

function normalizeLocation(pathname: string): { mode: ModeId; transport: TransportId } | null {
  const normalizedPathname = pathname === '/' ? '/server-rendered/rest' : pathname;
  const segments = normalizedPathname.split('/').filter(Boolean);

  if (segments.length < 2) {
    return null;
  }

  const [mode, transport] = segments;

  if ((mode === 'server-rendered' || mode === 'client-rendered') && (transport === 'rest' || transport === 'graphql')) {
    return {
      mode,
      transport,
    };
  }

  return null;
}

function App() {
  const [location, setLocation] = useState<BrowserLocationState>(() => {
    return readBrowserLocation();
  });

  useEffect(() => {
    const onPopState = () => {
      setLocation(readBrowserLocation());
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const navigate = (url: string, options?: { replace?: boolean }) => {
    const method = options?.replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', toAppHref(url));
    setLocation(readBrowserLocation());
  };

  const activeLocation = useMemo(() => {
    return normalizeLocation(location.pathname) || { mode: 'server-rendered' as const, transport: 'rest' as const };
  }, [location.pathname]);

  useEffect(() => {
    if (normalizeLocation(location.pathname)) {
      return;
    }

    navigate(`/server-rendered/rest${location.search}`, { replace: true });
  }, [location.pathname, location.search]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)] md:px-8">
          <a
            href={toAppHref('/server-rendered/rest?example=single-page&scenario=html-default-theme')}
            onClick={(event) => {
              event.preventDefault();
              navigate('/server-rendered/rest?example=single-page&scenario=html-default-theme');
            }}
            className="flex items-center gap-3"
          >
            <div className="size-6 shrink-0">
              <FormieLogo />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Formie React Starter</p>
            </div>
          </a>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 p-6 md:grid-cols-[14rem_minmax(0,1fr)] md:p-8">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav className="space-y-6">
            {(['server-rendered', 'client-rendered'] as const).map((sectionMode) => {
              const sectionItems = NAV_ITEMS.filter((item) => {
                return item.mode === sectionMode;
              });

              return (
                <div key={sectionMode} className="space-y-2">
                  <p className="px-3 text-sm font-semibold text-slate-900">
                    {sectionMode === 'server-rendered' ? 'Server-rendered' : 'Client-rendered'}
                  </p>

                  <div className="space-y-1">
                    {sectionItems.map((item) => {
                      const isActive = item.mode === activeLocation.mode && item.transport === activeLocation.transport;

                      return (
                        <a
                          key={`${item.mode}:${item.transport}`}
                          href={toAppHref(item.href)}
                          onClick={(event) => {
                            event.preventDefault();
                            navigate(item.href);
                          }}
                          className={`block rounded-lg px-3 py-2 text-sm transition ${isActive
                            ? 'bg-white font-medium text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                          {item.title}
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-6">
          {activeLocation.transport === 'rest' ? (
            <RestRoute
              key={`${activeLocation.mode}:rest`}
              mode={activeLocation.mode}
              search={location.search}
              navigate={navigate}
              toAppHref={toAppHref}
            />
          ) : (
            <GraphqlRoute
              key={`${activeLocation.mode}:graphql`}
              mode={activeLocation.mode}
              search={location.search}
              navigate={navigate}
              toAppHref={toAppHref}
            />
          )}

          <footer className="pt-2 text-center">
            <VerbbLogo />
          </footer>
        </div>
      </main>
    </>
  );
}

export default App;
