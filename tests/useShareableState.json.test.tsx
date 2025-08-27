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

  test('parses and serializes complex JSON objects', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    type Config = { 
      theme: string; 
      settings: { darkMode: boolean; fontSize: number }; 
      tags: string[] 
    };
    
    const defaultConfig: Config = {
      theme: 'light',
      settings: { darkMode: false, fontSize: 14 },
      tags: []
    };

    function Demo() {
      const [config, setConfig] = useShareableState('config').json<Config>()(defaultConfig);
      return (
        <div>
          <div id="theme">{config.theme}</div>
          <div id="dark-mode">{String(config.settings.darkMode)}</div>
          <div id="font-size">{config.settings.fontSize}</div>
          <div id="tags">{config.tags.join(',')}</div>
          <button id="update" onClick={() => setConfig({
            theme: 'dark',
            settings: { darkMode: true, fontSize: 16 },
            tags: ['work', 'urgent']
          })}>Update</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    
    // Initial state
    expect(container.querySelector('#theme')?.textContent).toBe('light');
    expect(container.querySelector('#dark-mode')?.textContent).toBe('false');
    expect(container.querySelector('#font-size')?.textContent).toBe('14');
    expect(container.querySelector('#tags')?.textContent).toBe('');

    // Update state
    await act(async () => (container.querySelector('#update') as HTMLButtonElement).click());
    expect(container.querySelector('#theme')?.textContent).toBe('dark');
    expect(container.querySelector('#dark-mode')?.textContent).toBe('true');
    expect(container.querySelector('#font-size')?.textContent).toBe('16');
    expect(container.querySelector('#tags')?.textContent).toBe('work,urgent');
    
    const urlParam = new URL(window.location.href).searchParams.get('config');
    const parsed = JSON.parse(urlParam!);
    expect(parsed).toEqual({
      theme: 'dark',
      settings: { darkMode: true, fontSize: 16 },
      tags: ['work', 'urgent']
    });
  });

  test('JSON with custom validation', async () => {
    const url = new URL('http://localhost/?user=%7B%22name%22%3A%22John%22%2C%22age%22%3A25%7D'); // {"name":"John","age":25}
    window.history.replaceState(null, '', url);

    type User = { name: string; age: number };
    
    function isUser(value: unknown): value is User {
      if (typeof value !== 'object' || value === null) return false;
      const rec = value as Record<string, unknown>;
      return typeof rec.name === 'string' && typeof rec.age === 'number';
    }

    function Demo() {
      const [user, setUser] = useShareableState('user').json<User>()(
        { name: '', age: 0 },
        { validate: isUser }
      );
      return (
        <div>
          <div id="user">{user.name}:{user.age}</div>
          <button id="valid" onClick={() => setUser({ name: 'Alice', age: 30 })}>Set Valid</button>
          <button id="invalid" onClick={() => setUser({ name: 'Bob', age: 0 })}>Set Valid But Different</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#user')?.textContent).toBe('John:25'); // Valid JSON parsed

    await act(async () => (container.querySelector('#valid') as HTMLButtonElement).click());
    expect(container.querySelector('#user')?.textContent).toBe('Alice:30');
    
    await act(async () => (container.querySelector('#invalid') as HTMLButtonElement).click());
    expect(container.querySelector('#user')?.textContent).toBe('Bob:0'); // Should change since it's valid
  });

  test('JSON with custom stringify and parse functions', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    type Vector = { x: number; y: number };

    function Demo() {
      const [vector, setVector] = useShareableState('vector').json<Vector>()(
        { x: 0, y: 0 },
        {
          stringify: (v) => `${v.x},${v.y}`, // Custom format: "x,y"
          parse: (raw) => {
            const [x, y] = raw.split(',').map(Number);
            return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y };
          }
        }
      );
      return (
        <div>
          <div id="vector">{vector.x},{vector.y}</div>
          <button id="set" onClick={() => setVector({ x: 10, y: 20 })}>Set Vector</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#vector')?.textContent).toBe('0,0');

    await act(async () => (container.querySelector('#set') as HTMLButtonElement).click());
    expect(container.querySelector('#vector')?.textContent).toBe('10,20');
    expect(new URL(window.location.href).searchParams.get('vector')).toBe('10,20'); // Custom format
  });

  test('JSON optional with null handling', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    type Preferences = { theme: string; notifications: boolean };

    function Demo() {
      const [prefs, setPrefs] = useShareableState('prefs').json<Preferences>().optional();
      return (
        <div>
          <div id="value">{prefs ? `${prefs.theme}:${prefs.notifications}` : 'null'}</div>
          <button id="set" onClick={() => setPrefs({ theme: 'dark', notifications: true })}>Set</button>
          <button id="clear" onClick={() => setPrefs(null)}>Clear</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#value')?.textContent).toBe('null');
    expect(new URL(window.location.href).searchParams.get('prefs')).toBeNull();

    await act(async () => (container.querySelector('#set') as HTMLButtonElement).click());
    expect(container.querySelector('#value')?.textContent).toBe('dark:true');
    expect(new URL(window.location.href).searchParams.get('prefs')).toBe('{"theme":"dark","notifications":true}');

    await act(async () => (container.querySelector('#clear') as HTMLButtonElement).click());
    expect(container.querySelector('#value')?.textContent).toBe('null');
    expect(new URL(window.location.href).searchParams.get('prefs')).toBeNull();
  });

  test('JSON handles malformed input gracefully', async () => {
    const url = new URL('http://localhost/?data=invalid-json');
    window.history.replaceState(null, '', url);

    type Data = { value: number };

    function Demo() {
      const [data, setData] = useShareableState('data').json<Data>()({ value: 0 });
      return (
        <div>
          <div id="value">{data.value}</div>
          <button id="set" onClick={() => setData({ value: 42 })}>Set</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#value')?.textContent).toBe('0'); // Fallback to default

    await act(async () => (container.querySelector('#set') as HTMLButtonElement).click());
    expect(container.querySelector('#value')?.textContent).toBe('42');
    expect(new URL(window.location.href).searchParams.get('data')).toBe('{"value":42}');
  });

  test('JSON with push action', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    type State = { count: number };

    function Demo() {
      const [state, setState] = useShareableState('state').json<State>()(
        { count: 0 },
        { action: 'push' }
      );
      return (
        <div>
          <div id="count">{state.count}</div>
          <button id="increment" onClick={() => setState({ count: state.count + 1 })}>Increment</button>
        </div>
      );
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#count')?.textContent).toBe('0');

    await act(async () => (container.querySelector('#increment') as HTMLButtonElement).click());
    expect(container.querySelector('#count')?.textContent).toBe('1');
    expect(new URL(window.location.href).searchParams.get('state')).toBe('{"count":1}');
  });
});
