import React, { StrictMode } from 'react';
import { describe, expect, test } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useShareableState } from '../src/useShareableState';

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
        <button id="btn" onClick={() => setN((p: number) => p + 1)}>
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

  test('complete test', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [q, setQ] = useShareableState('q').string().optional();
      const [x, setX] = useShareableState('x').number(0);
      const [y, setY] = useShareableState('y').enum(['a', 'b', 'c'], 'a');
      const [z, setZ] = useShareableState('z').json<{ a: number }>({ a: 0 });
      const [w, setW] = useShareableState('w').date().optional();

      return (
        <div>
          <button id="btnq" onClick={() => setQ('hello')}>
            {String(q)}
          </button>
          <button id="btnx" onClick={() => setX(1)}>
            {String(x)}
          </button>
          <button id="btny" onClick={() => setY('b')}>
            {String(y)}
          </button>
          <button id="btnz" onClick={() => setZ({ a: 1 })}>
            {String(z.a)}
          </button>
          <button id="btnw" onClick={() => setW(new Date())}>
            {String(w)}
          </button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(new URL(window.location.href).searchParams.get('q')).toBe(null);
    const btnq = container.querySelector('#btnq') as HTMLButtonElement;
    await act(async () => {
      btnq.click();
    });
    expect(new URL(window.location.href).searchParams.get('x')).toBe('0');



    const btnx = container.querySelector('#btnx') as HTMLButtonElement;

    expect(new URL(window.location.href).searchParams.get('x')).toBe('0');
    await act(async () => {
      btnx.click();
    });
    expect(new URL(window.location.href).searchParams.get('x')).toBe('1');

    const btny = container.querySelector('#btny') as HTMLButtonElement;
    expect(new URL(window.location.href).searchParams.get('y')).toBe('a');
    await act(async () => {
      btny.click();
    });
    expect(new URL(window.location.href).searchParams.get('y')).toBe('b');
    
    const btnz = container.querySelector('#btnz') as HTMLButtonElement;
    await act(async () => {
      btnz.click();
    });
    expect(new URL(window.location.href).searchParams.get('z')).toBe('{"a":1}');

    const btnw = container.querySelector('#btnw') as HTMLButtonElement;

    expect(new URL(window.location.href).searchParams.get('w')).toBe(null);
    await act(async () => {
      btnw.click();
    });
    // Date is formatted as yyyy-MM-dd, so we expect today's date
    const today = new Date();
    const expectedDateString = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
    expect(new URL(window.location.href).searchParams.get('w')).toBe(expectedDateString);


  });
});
