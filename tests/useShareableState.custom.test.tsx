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

describe('useShareableState/custom', () => {
  test('custom array parser serializes to comma-separated values', async () => {
    const url = new URL('http://localhost/?tags=work,urgent,todo');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [tags, setTags] = useShareableState('tags').custom<string[]>()(
        [],
        (raw) => raw ? raw.split(',').filter(Boolean) : [],
        (arr) => arr.length === 0 ? '' : arr.join(',')
      );
      return (
        <div>
          <div id="tags">{tags.join(' | ')}</div>
          <div id="count">{tags.length}</div>
          <button id="add" onClick={() => setTags([...tags, 'new'])}>Add</button>
          <button id="clear" onClick={() => setTags([])}>Clear</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#tags')?.textContent).toBe('work | urgent | todo');
    expect(container.querySelector('#count')?.textContent).toBe('3');

    await act(async () => (container.querySelector('#add') as HTMLButtonElement).click());
    expect(container.querySelector('#tags')?.textContent).toBe('work | urgent | todo | new');
    expect(new URL(window.location.href).searchParams.get('tags')).toBe('work,urgent,todo,new');

    await act(async () => (container.querySelector('#clear') as HTMLButtonElement).click());
    expect(container.querySelector('#tags')?.textContent).toBe('');
    // When array is empty, the formatted value is empty string, which removes the param
    expect(new URL(window.location.href).searchParams.get('tags')).toBeNull();
  });

  test('custom number array with specialized parsing', async () => {
    const url = new URL('http://localhost/?scores=85:92:78:95');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [scores, setScores] = useShareableState('scores').custom<number[]>()(
        [0],
        (raw) => {
          if (!raw) return [];
          return raw.split(':').map(Number).filter(n => !isNaN(n));
        },
        (arr) => arr.join(':')
      );
      
      const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      
      return (
        <div>
          <div id="scores">{scores.join(', ')}</div>
          <div id="average">{average}</div>
          <button id="add" onClick={() => setScores([...scores, 88])}>Add Score</button>
          <button id="reset" onClick={() => setScores([100])}>Reset</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#scores')?.textContent).toBe('85, 92, 78, 95');
    expect(container.querySelector('#average')?.textContent).toBe('88'); // (85+92+78+95)/4 = 87.5 rounded to 88

    await act(async () => (container.querySelector('#add') as HTMLButtonElement).click());
    expect(container.querySelector('#scores')?.textContent).toBe('85, 92, 78, 95, 88');
    expect(new URL(window.location.href).searchParams.get('scores')).toBe('85:92:78:95:88');

    await act(async () => (container.querySelector('#reset') as HTMLButtonElement).click());
    expect(container.querySelector('#scores')?.textContent).toBe('100');
    expect(new URL(window.location.href).searchParams.get('scores')).toBe('100');
  });

  test('custom object with base64 encoding', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    type Point = { x: number; y: number; label: string };

    function Demo() {
      const [point, setPoint] = useShareableState('point').custom<Point>()(
        { x: 0, y: 0, label: 'origin' },
        (raw) => {
          try {
            const decoded = atob(raw);
            const parsed = JSON.parse(decoded);
            return parsed;
          } catch {
            return null;
          }
        },
        (obj) => btoa(JSON.stringify(obj))
      );
      
      return (
        <div>
          <div id="point">{point.label}: ({point.x}, {point.y})</div>
          <button id="move" onClick={() => setPoint({ x: 10, y: 20, label: 'moved' })}>Move</button>
          <button id="home" onClick={() => setPoint({ x: 0, y: 0, label: 'home' })}>Home</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#point')?.textContent).toBe('origin: (0, 0)');

    await act(async () => (container.querySelector('#move') as HTMLButtonElement).click());
    expect(container.querySelector('#point')?.textContent).toBe('moved: (10, 20)');
    
    // Should be base64 encoded
    const urlParam = new URL(window.location.href).searchParams.get('point');
    const decoded = JSON.parse(atob(urlParam!));
    expect(decoded).toEqual({ x: 10, y: 20, label: 'moved' });

    await act(async () => (container.querySelector('#home') as HTMLButtonElement).click());
    expect(container.querySelector('#point')?.textContent).toBe('home: (0, 0)');
  });

  test('custom optional parser with fallback handling', async () => {
    const url = new URL('http://localhost/?coords=invalid-data');
    window.history.replaceState(null, '', url);

    type Coordinates = { lat: number; lng: number };

    function Demo() {
      const [coords, setCoords] = useShareableState('coords').custom<Coordinates>().optional(
        null,
        (raw) => {
          const parts = raw.split(',');
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          
          if (isNaN(lat) || isNaN(lng)) return null;
          return { lat, lng };
        },
        (value) => value === null ? '' : `${value.lat},${value.lng}`
      );
      
      return (
        <div>
          <div id="coords">{coords ? `${coords.lat},${coords.lng}` : 'null'}</div>
          <button id="set-ny" onClick={() => setCoords({ lat: 40.7128, lng: -74.0060 })}>Set NYC</button>
          <button id="set-london" onClick={() => setCoords({ lat: 51.5074, lng: -0.1278 })}>Set London</button>
          <button id="clear" onClick={() => setCoords(null)}>Clear</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#coords')?.textContent).toBe('null'); // Invalid data fell back to null

    await act(async () => (container.querySelector('#set-ny') as HTMLButtonElement).click());
    expect(container.querySelector('#coords')?.textContent).toBe('40.7128,-74.006');
    expect(new URL(window.location.href).searchParams.get('coords')).toBe('40.7128,-74.006');

    await act(async () => (container.querySelector('#set-london') as HTMLButtonElement).click());
    expect(container.querySelector('#coords')?.textContent).toBe('51.5074,-0.1278');

    await act(async () => (container.querySelector('#clear') as HTMLButtonElement).click());
    expect(container.querySelector('#coords')?.textContent).toBe('null');
    expect(new URL(window.location.href).searchParams.get('coords')).toBeNull();
  });

  test('custom with complex data structure and versioning', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    type VersionedData = {
      version: number;
      data: { name: string; items: string[] };
    };

    function Demo() {
      const [state, setState] = useShareableState('state').custom<VersionedData>()(
        { version: 1, data: { name: 'default', items: [] } },
        (raw) => {
          try {
            const parsed = JSON.parse(raw);
            // Version migration logic
            if (parsed.version === 1) {
              return parsed;
            }
            // Future versions could be migrated here
            return null;
          } catch {
            return null;
          }
        },
        (obj) => JSON.stringify(obj)
      );
      
      return (
        <div>
          <div id="version">v{state.version}</div>
          <div id="name">{state.data.name}</div>
          <div id="items">{state.data.items.join(', ')}</div>
          <button id="update" onClick={() => setState({
            version: 1,
            data: { name: 'updated', items: ['a', 'b', 'c'] }
          })}>Update</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#version')?.textContent).toBe('v1');
    expect(container.querySelector('#name')?.textContent).toBe('default');
    expect(container.querySelector('#items')?.textContent).toBe('');

    await act(async () => (container.querySelector('#update') as HTMLButtonElement).click());
    expect(container.querySelector('#version')?.textContent).toBe('v1');
    expect(container.querySelector('#name')?.textContent).toBe('updated');
    expect(container.querySelector('#items')?.textContent).toBe('a, b, c');
    
    const urlParam = new URL(window.location.href).searchParams.get('state');
    const parsed = JSON.parse(urlParam!);
    expect(parsed.version).toBe(1);
    expect(parsed.data.name).toBe('updated');
  });

  test('custom with updater function', async () => {
    const url = new URL('http://localhost/?set=a,b,c');
    window.history.replaceState(null, '', url);

    function Demo() {
      const [items, setItems] = useShareableState('set').custom<Set<string>>()(
        new Set(),
        (raw) => new Set(raw ? raw.split(',').filter(Boolean) : []),
        (set) => Array.from(set).join(',')
      );
      
      return (
        <div>
          <div id="items">{Array.from(items).sort().join(', ')}</div>
          <div id="size">{items.size}</div>
          <button id="add" onClick={() => setItems(prev => new Set([...prev, 'd']))}>Add D</button>
          <button id="remove" onClick={() => setItems(prev => {
            const newSet = new Set(prev);
            newSet.delete('b');
            return newSet;
          })}>Remove B</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#items')?.textContent).toBe('a, b, c');
    expect(container.querySelector('#size')?.textContent).toBe('3');

    await act(async () => (container.querySelector('#add') as HTMLButtonElement).click());
    expect(container.querySelector('#items')?.textContent).toBe('a, b, c, d');
    expect(container.querySelector('#size')?.textContent).toBe('4');

    await act(async () => (container.querySelector('#remove') as HTMLButtonElement).click());
    expect(container.querySelector('#items')?.textContent).toBe('a, c, d');
    expect(container.querySelector('#size')?.textContent).toBe('3');
  });

  test('custom with push action', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    type Range = { min: number; max: number };

    function Demo() {
      const [range, setRange] = useShareableState('range').custom<Range>()(
        { min: 0, max: 100 },
        (raw) => {
          const [min, max] = raw.split('-').map(Number);
          return isNaN(min) || isNaN(max) ? null : { min, max };
        },
        (r) => `${r.min}-${r.max}`,
        { action: 'push' }
      );
      
      return (
        <div>
          <div id="range">{range.min} to {range.max}</div>
          <button id="narrow" onClick={() => setRange({ min: 25, max: 75 })}>Narrow</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#range')?.textContent).toBe('0 to 100');

    await act(async () => (container.querySelector('#narrow') as HTMLButtonElement).click());
    expect(container.querySelector('#range')?.textContent).toBe('25 to 75');
    expect(new URL(window.location.href).searchParams.get('range')).toBe('25-75');
  });
});
