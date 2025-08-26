import React, { StrictMode, useEffect } from 'react';
import { describe, expect, test } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useShareableState } from '../src/useShareableState.js';

async function render(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<StrictMode>{ui}</StrictMode>);
  });
  return { container, root };
}

describe('useShareableState/events', () => {
  test('dispatches qs:changed on set', async () => {
    const url = new URL('http://localhost/?n=1');
    window.history.replaceState(null, '', url);

    let received = 0;
    function Listener() {
      useEffect(() => {
        const onChanged = (e: Event) => {
          // @ts-expect-error CustomEvent detail is not typed on Event
          if (e && (e as CustomEvent).detail?.key === 'n') received++;
        };
        window.addEventListener('qs:changed', onChanged as EventListener);
        return () => window.removeEventListener('qs:changed', onChanged as EventListener);
      }, []);
      return null;
    }

    function Demo() {
      const [n, setN] = useShareableState('n').number(1);
      return (
        <>
          <Listener />
          <button id="btn" onClick={() => setN(n + 1)}>
            {String(n)}
          </button>
        </>
      );
    }

    const { container } = await render(<Demo />);
    await act(async () => (container.querySelector('#btn') as HTMLButtonElement).click());
    expect(received).toBeGreaterThan(0);
  });
});
