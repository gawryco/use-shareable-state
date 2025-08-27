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

describe('useShareableState/enum', () => {
  test('falls back to default for invalid values', async () => {
    const url = new URL('http://localhost/?t=neon');
    window.history.replaceState(null, '', url);

    type Theme = 'light' | 'dark';
    function Demo() {
      const [t] = useShareableState('t').enum<Theme>()(['light', 'dark'], 'light');
      return <div id="v">{t}</div>;
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#v')?.textContent).toBe('light');
  });
});
