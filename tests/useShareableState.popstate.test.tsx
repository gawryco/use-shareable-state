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

describe('useShareableState/popstate', () => {
  test('updates state when browser history changes', async () => {
    const url = new URL('http://localhost/?n=1');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [n] = useShareableState('n').number(0);
      return <div id="v">{String(n)}</div>;
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#v')?.textContent).toBe('1');

    // simulate navigation to n=5
    const url2 = new URL('http://localhost/?n=5');
    window.history.pushState(null, '', url2);
    window.dispatchEvent(new PopStateEvent('popstate'));

    // wait a tick for effect to run
    await act(async () => {});
    expect(container.querySelector('#v')?.textContent).toBe('5');
  });
});
