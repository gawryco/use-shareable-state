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

describe('useShareableState/boolean', () => {
  test('parses common truthy/falsy values and toggles', async () => {
    const url = new URL('http://localhost/?open=true');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [open, setOpen] = useShareableState('open').boolean(false);
      return (
        <button id="btn" onClick={() => setOpen((v) => !v)}>
          {open ? '1' : '0'}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('1');
    await act(async () => btn.click());
    expect(new URL(window.location.href).searchParams.get('open')).toBe('0');
  });
});
