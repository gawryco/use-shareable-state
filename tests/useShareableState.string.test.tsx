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

describe('useShareableState/string', () => {
  test('seeds missing param and updates URL on changes', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [q, setQ] = useShareableState('q').string('hello');
      return (
        <button id="btn" onClick={() => setQ('world')}>
          {q}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(new URL(window.location.href).searchParams.get('q')).toBe('hello');
    await act(async () => btn.click());
    expect(new URL(window.location.href).searchParams.get('q')).toBe('world');
  });
});
