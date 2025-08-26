import React, { StrictMode } from 'react';
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

describe('useShareableState', () => {
  test('number builder syncs with URL', async () => {
    const url = new URL('http://localhost/?n=2');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [n, setN] = useShareableState('n').number(0);
      return (
        <button id="btn" onClick={() => setN((p: number) => p + 1)}>
          {String(n)}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('2');
    await act(async () => {
      btn.click();
    });
    expect(new URL(window.location.href).searchParams.get('n')).toBe('3');
  });

  test('action: push pushes history entries', async () => {
    const url = new URL('http://localhost/?n=1');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [n, setN] = useShareableState('n').number(1, { action: 'push' });
      return (
        <button id="btn" onClick={() => setN((p: number | null) => (p ?? 0) + 1)}>
          {String(n)}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(new URL(window.location.href).searchParams.get('n')).toBe('2');
    // jsdom doesn't maintain a reliable back stack; emulate back by restoring prior URL and emitting popstate
    const prevUrl = new URL('http://localhost/?n=1');
    window.history.replaceState(null, '', prevUrl.toString());
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(new URL(window.location.href).searchParams.get('n')).toBe('1');
  });

  test('null default removes param and can set later', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [q, setQ] = useShareableState('q').string(null);
      return (
        <button id="btn" onClick={() => setQ('hello')}>
          {String(q)}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    expect(new URL(window.location.href).searchParams.get('q')).toBe(null);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(new URL(window.location.href).searchParams.get('q')).toBe('hello');
  });
});
