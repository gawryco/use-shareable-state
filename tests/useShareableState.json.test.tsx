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

describe('useShareableState/json', () => {
  test('deletes param when omitEmpty returns true', async () => {
    const url = new URL('http://localhost/?f=%7B%22q%22%3A%22x%22%7D'); // {"q":"x"}
    window.history.replaceState(null, '', url);

    type Filters = { q: string };
    function Demo() {
      const [f, setF] = useShareableState('f').json<Filters>()(
        { q: '' },
        {
          omitEmpty: (v) => v.q === '',
        },
      );
      return (
        <button id="btn" onClick={() => setF({ q: '' })}>
          {f.q}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    expect(new URL(window.location.href).searchParams.get('f')).toBe('{"q":"x"}');
    await act(async () => (container.querySelector('#btn') as HTMLButtonElement).click());
    expect(new URL(window.location.href).searchParams.get('f')).toBeNull();
  });
});
