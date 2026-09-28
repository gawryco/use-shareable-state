import React, { StrictMode } from 'react';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
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

// Local calendar components, the way an app built on `new Date(y, m, d)` reads them
function localYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function param(key: string): string | null {
  return new URL(window.location.href).searchParams.get(key);
}

describe('useShareableState/date', () => {
  test('clamps to min/max and formats yyyy-MM-dd', async () => {
    const url = new URL('http://localhost/?d=2020-01-01');
    window.history.replaceState(null, '', url);

    const min = new Date(2020, 0, 10);
    const max = new Date(2020, 0, 20);

    function Demo() {
      const [d, setD] = useShareableState('d').date(new Date(2020, 0, 15), { min, max });
      return (
        <button id="btn" onClick={() => setD(new Date(2020, 0, 25))}>
          {localYMD(d)}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    // initial from URL
    expect(btn.textContent).toBe('2020-01-10' /* clamped up to min on init */);
    await act(async () => btn.click());
    // after click, also clamped to max
    expect(param('d')).toBe('2020-01-20');
  });

  test('rejects dates that do not exist on the calendar', async () => {
    window.history.replaceState(null, '', new URL('http://localhost/?d=2026-02-31'));

    function Demo() {
      const [d] = useShareableState('d').date(new Date(2026, 0, 1));
      return <div id="out">{localYMD(d)}</div>;
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#out')?.textContent).toBe('2026-01-01');
  });

  // Behind UTC, ahead of UTC, and UTC itself: the calendar day must survive in all of them
  describe.each(['America/Sao_Paulo', 'America/Rio_Branco', 'UTC', 'Asia/Tokyo'])('in %s', (tz) => {
    let originalTZ: string | undefined;
    beforeAll(() => {
      originalTZ = process.env.TZ;
      process.env.TZ = tz;
    });
    afterAll(() => {
      if (originalTZ === undefined) delete process.env.TZ;
      else process.env.TZ = originalTZ;
    });

    test('reads a date from the URL as that local calendar day', async () => {
      window.history.replaceState(null, '', new URL('http://localhost/?start=2026-11-30'));

      function Demo() {
        const [start] = useShareableState('start').date(new Date(2020, 0, 1));
        const [end] = useShareableState('start').date().optional();
        return (
          <div>
            <div id="start">{localYMD(start)}</div>
            <div id="end">{end ? localYMD(end) : 'null'}</div>
          </div>
        );
      }

      const { container } = await render(<Demo />);
      expect(container.querySelector('#start')?.textContent).toBe('2026-11-30');
      expect(container.querySelector('#end')?.textContent).toBe('2026-11-30');
    });

    test('writes a locally picked date to the URL as that calendar day', async () => {
      window.history.replaceState(null, '', new URL('http://localhost/'));

      function Demo() {
        const [, setStart] = useShareableState('start').date(new Date(2026, 0, 1));
        const [, setEnd] = useShareableState('end').date().optional();
        return (
          <button
            id="pick"
            onClick={() => {
              setStart(new Date(2026, 10, 30));
              setEnd(new Date(2026, 10, 30));
            }}
          />
        );
      }

      const { container } = await render(<Demo />);
      // default seeded into the URL uses the same calendar
      expect(param('start')).toBe('2026-01-01');
      await act(async () => (container.querySelector('#pick') as HTMLButtonElement).click());
      expect(param('start')).toBe('2026-11-30');
      expect(param('end')).toBe('2026-11-30');
    });

    test('round-trips a picked date back to the same calendar day', async () => {
      window.history.replaceState(null, '', new URL('http://localhost/'));

      function Writer() {
        const [, setStart] = useShareableState('start').date(new Date(2026, 0, 1));
        return <button id="pick" onClick={() => setStart(new Date(2026, 10, 30))} />;
      }

      const writer = await render(<Writer />);
      await act(async () => (writer.container.querySelector('#pick') as HTMLButtonElement).click());

      // A fresh mount (someone opening the shared link) sees the same day
      function Reader() {
        const [start] = useShareableState('start').date(new Date(2026, 0, 1));
        return <div id="start">{localYMD(start)}</div>;
      }

      const reader = await render(<Reader />);
      expect(reader.container.querySelector('#start')?.textContent).toBe('2026-11-30');
    });
  });
});
