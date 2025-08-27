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
  test('falls back to default for invalid values (builder pattern)', async () => {
    const url = new URL('http://localhost/?t=neon');
    window.history.replaceState(null, '', url);

    type Theme = 'light' | 'dark';
    function Demo() {
      const enumBuilder = useShareableState('t').enum<Theme>();
      const [t] = enumBuilder(['light', 'dark'], 'light');
      return <div id="v">{t}</div>;
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#v')?.textContent).toBe('light');
  });

  test('direct call pattern works correctly', async () => {
    const url = new URL('http://localhost/?pjAnexo=III');
    window.history.replaceState(null, '', url);

    type SimplesAnexo = 'auto' | 'III' | 'V';
    function Demo() {
      const [pjAnexo] = useShareableState('pjAnexo').enum<SimplesAnexo>(['auto', 'III', 'V'] as const, 'auto');
      return <div id="v">{pjAnexo}</div>;
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#v')?.textContent).toBe('III');
  });

  test('direct call pattern falls back to default for invalid values', async () => {
    const url = new URL('http://localhost/?pjAnexo=invalid');
    window.history.replaceState(null, '', url);

    type SimplesAnexo = 'auto' | 'III' | 'V';
    function Demo() {
      const [pjAnexo] = useShareableState('pjAnexo').enum<SimplesAnexo>(['auto', 'III', 'V'] as const, 'auto');
      return <div id="v">{pjAnexo}</div>;
    }

    const { container } = await render(<Demo />);
    expect(container.querySelector('#v')?.textContent).toBe('auto');
  });

  test('direct call pattern updates URL when value changes', async () => {
    const url = new URL('http://localhost/?status=pending');
    window.history.replaceState(null, '', url);

    type Status = 'pending' | 'approved' | 'rejected';
    function Demo() {
      const [status, setStatus] = useShareableState('status').enum<Status>(['pending', 'approved', 'rejected'], 'pending');
      return (
        <button id="btn" onClick={() => setStatus('approved')}>
          {status}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('pending');
    
    await act(async () => btn.click());
    expect(new URL(window.location.href).searchParams.get('status')).toBe('approved');
    expect(btn.textContent).toBe('approved');
  });

  test('builder pattern with optional creates nullable enum', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    type Priority = 'low' | 'medium' | 'high';
    function Demo() {
      const enumBuilder = useShareableState('priority').enum<Priority>();
      const [priority, setPriority] = enumBuilder.optional(['low', 'medium', 'high']);
      return (
        <button id="btn" onClick={() => setPriority('high')}>
          {priority ?? 'null'}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('null');
    expect(new URL(window.location.href).searchParams.get('priority')).toBeNull();
    
    await act(async () => btn.click());
    expect(new URL(window.location.href).searchParams.get('priority')).toBe('high');
    expect(btn.textContent).toBe('high');
  });

  test('optional enum with default value', async () => {
    const url = new URL('http://localhost/');
    window.history.replaceState(null, '', url);

    type Size = 'small' | 'medium' | 'large';
    function Demo() {
      const enumBuilder = useShareableState('size').enum<Size>();
      const [size, setSize] = enumBuilder.optional(['small', 'medium', 'large'], 'medium');
      return (
        <button id="btn" onClick={() => setSize(null)}>
          {size ?? 'null'}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('medium');
    
    await act(async () => btn.click());
    expect(new URL(window.location.href).searchParams.get('size')).toBeNull();
    expect(btn.textContent).toBe('null');
  });

  test('optional enum ignores invalid URL values', async () => {
    const url = new URL('http://localhost/?theme=rainbow');
    window.history.replaceState(null, '', url);

    type Theme = 'light' | 'dark';
    function Demo() {
      const enumBuilder = useShareableState('theme').enum<Theme>();
      const [theme, setTheme] = enumBuilder.optional(['light', 'dark'], 'light');
      return (
        <button id="btn" onClick={() => setTheme('dark')}>
          {theme ?? 'null'}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('light'); // Should fallback to default, not null
    
    await act(async () => btn.click());
    expect(new URL(window.location.href).searchParams.get('theme')).toBe('dark');
  });

  test('enum with push action', async () => {
    const url = new URL('http://localhost/?mode=read');
    window.history.replaceState(null, '', url);

    type Mode = 'read' | 'write' | 'admin';
    function Demo() {
      const [mode, setMode] = useShareableState('mode').enum<Mode>(['read', 'write', 'admin'], 'read', { action: 'push' });
      return (
        <button id="btn" onClick={() => setMode('write')}>
          {mode}
        </button>
      );
    }

    const { container } = await render(<Demo />);
    const btn = container.querySelector('#btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('read');
    
    await act(async () => btn.click());
    expect(new URL(window.location.href).searchParams.get('mode')).toBe('write');
  });
});