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

describe('useShareableState/date', () => {
  test('clamps to min/max and formats yyyy-MM-dd', async () => {
    const url = new URL('http://localhost/?d=2020-01-01');
    window.history.replaceState(null, '', url);

    const min = new Date('2020-01-10');
    const max = new Date('2020-01-20');

    function Demo() {
      const [d, setD] = useShareableState('d').date(new Date('2020-01-15'), { min, max });
      return (
        <button id="btn" onClick={() => setD(new Date('2020-01-25'))}>
          {d.toISOString().slice(0, 10)}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    // initial from URL
    expect(btn.textContent).toBe('2020-01-10' /* clamped up to min on init */);
    await act(async () => btn.click());
    // after click, also clamped to max
    expect(new URL(window.location.href).searchParams.get('d')).toBe('2020-01-20');
  });
});
