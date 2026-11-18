'use client';

import { useRef, useState } from 'react';

type State = 'idle' | 'ok' | 'fail';

export const CopyButton = ({ text, label = 'Copy command' }: { text: string; label?: string }) => {
  const [state, setState] = useState<State>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = false;
    }
    setState(ok ? 'ok' : 'fail');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  };

  return (
    <button type="button" className="copy" data-state={state} aria-label={label} onClick={handleClick}>
      <span aria-live="polite">{state === 'ok' ? 'Copied' : state === 'fail' ? 'Failed' : 'Copy'}</span>
    </button>
  );
};
