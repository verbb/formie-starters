import { useEffect, useMemo, useState } from 'react';
import { highlightCode, type HighlightLanguage } from '../lib/highlight';

type CodePanelProps = {
  code: string;
  language: HighlightLanguage;
};

export function CodePanel({ code, language }: CodePanelProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const highlightedCode = useMemo(() => {
    return highlightCode(code, language);
  }, [code, language]);
  let copyLabel = 'Copy to clipboard';

  if (copyState === 'copied') {
    copyLabel = 'Copied';
  } else if (copyState === 'error') {
    copyLabel = 'Copy failed';
  }

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState('idle');
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyState]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm">
      <button
        type="button"
        onClick={() => {
          void handleCopy();
        }}
        className="absolute right-6 top-8 z-30 inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        title={copyLabel}
        aria-label={copyLabel}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        </svg>
      </button>
      <pre className="demo-code max-h-[32rem] overflow-auto p-6 text-xs text-slate-700">
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
}
