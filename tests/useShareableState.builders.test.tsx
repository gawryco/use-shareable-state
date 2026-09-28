import React, { StrictMode } from 'react';
import { describe, expect, expectTypeOf, test } from 'vitest';
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

function param(key: string): string | null {
  return new URL(window.location.href).searchParams.get(key);
}

// Every builder must support both documented call shapes:
//   .x(defaultValue, opts?)   -> non-nullable
//   .x().optional(...)        -> nullable
describe('useShareableState/builders', () => {
  test('number().optional() is nullable and clamps', async () => {
    window.history.replaceState(null, '', new URL('http://localhost/?min=-5'));

    function Demo() {
      const [min, setMin] = useShareableState('min').number().optional(undefined, { min: 0 });
      expectTypeOf(min).toEqualTypeOf<number | null>();
      return (
        <div>
          <div id="out">{String(min)}</div>
          <button id="clear" onClick={() => setMin(null)} />
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#out')?.textContent).toBe('0');
    await act(async () => (container.querySelector('#clear') as HTMLButtonElement).click());
    expect(container.querySelector('#out')?.textContent).toBe('null');
    expect(param('min')).toBeNull();
  });

  test('number.optional() keeps working for existing callers', async () => {
    window.history.replaceState(null, '', new URL('http://localhost/?n=7'));

    function Demo() {
      const [n] = useShareableState('n').number.optional();
      expectTypeOf(n).toEqualTypeOf<number | null>();
      return <div id="out">{String(n)}</div>;
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#out')?.textContent).toBe('7');
  });

  test('boolean().optional() is nullable', async () => {
    window.history.replaceState(null, '', new URL('http://localhost/'));

    function Demo() {
      const [on, setOn] = useShareableState('on').boolean().optional();
      expectTypeOf(on).toEqualTypeOf<boolean | null>();
      return (
        <button id="btn" onClick={() => setOn(true)}>
          {String(on)}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('null');
    expect(param('on')).toBeNull();
    await act(async () => btn.click());
    expect(param('on')).toBe('1');
  });

  test('boolean.optional() keeps working for existing callers', async () => {
    window.history.replaceState(null, '', new URL('http://localhost/?on=0'));

    function Demo() {
      const [on] = useShareableState('on').boolean.optional();
      expectTypeOf(on).toEqualTypeOf<boolean | null>();
      return <div id="out">{String(on)}</div>;
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#out')?.textContent).toBe('false');
  });

  test('custom<T>(defaultValue, parse, format) returns the state tuple', async () => {
    window.history.replaceState(null, '', new URL('http://localhost/?pos=3,4'));

    function Demo() {
      const [pos, setPos] = useShareableState('pos').custom<[number, number]>(
        [0, 0],
        (str) => {
          const [x, y] = str.split(',').map(Number);
          return [x || 0, y || 0];
        },
        ([x, y]) => `${x},${y}`,
      );
      expectTypeOf(pos).toEqualTypeOf<[number, number]>();
      return (
        <button id="btn" onClick={() => setPos([5, 6])}>
          {pos.join(',')}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('3,4');
    await act(async () => btn.click());
    expect(param('pos')).toBe('5,6');
  });

  test('setter clamps with the options of the latest render', async () => {
    window.history.replaceState(null, '', new URL('http://localhost/?n=5'));

    function Demo(props: { min: number }) {
      const [n, setN] = useShareableState('n').number(5, { min: props.min });
      return (
        <button id="btn" onClick={() => setN(0)}>
          {String(n)}
        </button>
      );
    }

    const { container, root } = await render(<Demo min={1} />);
    await act(async () => {
      root.render(
        <StrictMode>
          <Demo min={10} />
        </StrictMode>,
      );
    });
    await act(async () => (container.querySelector('#btn') as HTMLButtonElement).click());
    expect(param('n')).toBe('10');
  });

  test('options accept explicitly undefined values (exactOptionalPropertyTypes)', async () => {
    window.history.replaceState(null, '', new URL('http://localhost/'));

    function Demo(props: { min?: Date; maxLength?: number; push?: boolean }) {
      const action = props.push ? 'push' : undefined;
      const [d] = useShareableState('d').date(new Date(2026, 0, 1), { min: props.min, action });
      const [s] = useShareableState('s').string('abc', { maxLength: props.maxLength, action });
      const [n] = useShareableState('n').number(1, { min: undefined, action });
      expectTypeOf(d).toEqualTypeOf<Date>();
      expectTypeOf(s).toEqualTypeOf<string>();
      expectTypeOf(n).toEqualTypeOf<number>();
      return <div id="out">{`${s}:${n}`}</div>;
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#out')?.textContent).toBe('abc:1');
  });
});
