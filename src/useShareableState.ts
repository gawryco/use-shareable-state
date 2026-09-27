/**
 * useShareableState
 *
 * A small React utility that binds component state to URL query parameters,
 * enabling shareable, deep‑linkable state without boilerplate.
 *
 * Core ideas:
 * - Initialize React state from the current URL
 * - Keep URL and state synchronized when the setter is called
 * - Handle browser navigation (back/forward) by updating state accordingly
 * - Provide typed helpers (number, string, boolean, date, enum, custom, json)
 *
 * Examples (Zod-like builder pattern):
 *
 * 1) Non-nullable Number (required default)
 *   const [amount, setAmount] = useShareableState('amount').number(1000);
 *   setAmount(1500); // updates state AND ?amount=1500
 *   // amount is typed as: number (never null)
 *
 * 2) Nullable Number (optional)
 *   const [amount, setAmount] = useShareableState('amount').number().optional();
 *   setAmount(1500); // updates state AND ?amount=1500
 *   // amount is typed as: number | null
 *
 * 3) Non-nullable Date (ISO yyyy-MM-dd in URL)
 *   const [start, setStart] = useShareableState('start').date(new Date('2020-01-01'));
 *   setStart(new Date('2021-06-15')); // updates state AND ?start=2021-06-15
 *   // start is typed as: Date (never null)
 *
 * 4) Nullable Date (optional)
 *   const [end, setEnd] = useShareableState('end').date().optional();
 *   // end is typed as: Date | null
 *
 * 5) Non-nullable Enum
 *   type Index = 'us_cpi' | 'uk_rpi' | 'euro_hicp' | 'can_cpi' | 'aus_cpi';
 *   const [index, setIndex] = useShareableState('index').enum<Index>(
 *     ['us_cpi', 'uk_rpi', 'euro_hicp', 'can_cpi', 'aus_cpi'],
 *     'us_cpi'
 *   );
 *   // index is typed as: Index (never null)
 *
 * 6) Nullable Enum (optional)
 *   const [optIndex, setOptIndex] = useShareableState('opt').enum<Index>().optional(
 *     ['us_cpi', 'uk_rpi', 'euro_hicp', 'can_cpi', 'aus_cpi']
 *   );
 *   // optIndex is typed as: Index | null
 *
 * 7) Non-nullable Custom parser/formatter
 *   const [arr, setArr] = useShareableState('list').custom<number[]>([1,2,3],
 *     raw => { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : null; } catch { return null; } },
 *     v => JSON.stringify(v)
 *   );
 *   // arr is typed as: number[] (never null)
 *
 * 8) Nullable Custom (optional)
 *   const [optArr, setOptArr] = useShareableState('opt-list').custom<number[]>().optional(null,
 *     raw => { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : null; } catch { return null; } },
 *     v => v === null ? '' : JSON.stringify(v)
 *   );
 *   // optArr is typed as: number[] | null
 *
 * 9) Non-nullable JSON
 *   const [filters, setFilters] = useShareableState('f').json<{ q: string }>({ q: '' });
 *   // filters is typed as: { q: string } (never null)
 *
 * 10) Nullable JSON (optional)
 *   const [optFilters, setOptFilters] = useShareableState('opt-f').json<{ q: string }>().optional();
 *   // optFilters is typed as: { q: string } | null
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type QSChangeDetail<T> = {
  key: string;
  prev: T;
  next: T;
  params: Record<string, string>;
  source: 'set' | 'popstate';
  ts: number;
};

/**
 * Dispatches a DOM CustomEvent whenever the query-string linked state changes.
 *
 * Event name: `qs:changed`
 *
 * The event is fired for two sources:
 * - `set`: when the hook's setter updates the URL and state
 * - `popstate`: when browser navigation updates the URL and the hook syncs state
 *
 * The event detail contains the query key, previous value, next value, the
 * current params snapshot and a timestamp. This is primarily useful for
 * observing and debugging; it's considered an internal implementation detail.
 *
 * @internal
 */
function dispatchQSChange<T>(detail: QSChangeDetail<T>): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent('qs:changed', { detail }));
  } catch {}
}

/**
 * Setter signature returned by the hook methods. Mirrors React's `setState` API.
 *
 * Accepts either a direct value or an updater function of the previous value.
 *
 * @template T Value type
 * @param value Either the next value or a function that derives it from the previous value
 */
type Updater<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Detects a browser environment. Guards URL and history access during SSR.
 *
 * @returns `true` in the browser, `false` during SSR or non-DOM environments
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Safely returns current URLSearchParams in the browser or null during SSR.
 *
 * @returns URLSearchParams instance, or `null` when not available
 */
function safeGetSearchParams(): URLSearchParams | null {
  if (!isBrowser()) return null;
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
}

/**
 * Replaces the current URL's query string (without a navigation) so the page
 * stays in place and the history stack receives a new state.
 *
 * Uses `history.replaceState` to avoid pushing a new entry unless the consumer
 * opts into push behavior in a custom implementation.
 *
 * @param params Query parameters to apply to the current URL
 */
type HistoryAction = 'replace' | 'push';

function applyUrl(params: URLSearchParams, action: HistoryAction = 'replace'): void {
  if (!isBrowser()) return;
  const url = new URL(window.location.href);
  url.search = params.toString();
  if (action === 'push') {
    window.history.pushState(null, '', url.toString());
  } else {
    window.history.replaceState(null, '', url.toString());
  }
}

/**
 * Internal generic hook that wires a single query key to React state (nullable version).
 *
 * Behavior:
 * - On mount, initialize from the URL (or seed with default if missing)
 * - On updates via the setter, update both state and the URL param
 * - On browser navigation (popstate), re-parse the URL and update state
 *
 * @template T Value type
 * @param key Query string key (e.g., "amount")
 * @param defaultValue Default state used when the key is missing/invalid in the URL (can be null)
 * @param parse Function to parse the raw string into T. Return `null` to fall back to the default.
 * @param format Function to format T back into a query‑string friendly string. Return an empty string to delete the param.
 * @param normalize Optional post-parse normalization applied to every value before being stored
 * @returns A tuple `[state, setState]` with a React‑style setter that also syncs the URL
 */
function useQueryParam<T>(
  key: string,
  defaultValue: T | null,
  parse: (raw: string) => T | null,
  format: (value: T | null) => string,
  normalize?: (value: T) => T,
  opts?: ActionOpts,
): [T | null, Updater<T | null>] {
  const initial = useMemo(() => defaultValue, []);
  const [state, setState] = useState<T | null>(initial);
  const keyRef = useRef(key);
  keyRef.current = key;
  const actionRef = useRef<HistoryAction>(opts?.action ?? 'replace');
  actionRef.current = opts?.action ?? actionRef.current;

  // keep a ref to the latest state for popstate comparisons
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize from URL, and ensure default in URL if absent (unless default is null)
  useEffect(() => {
    if (!isBrowser()) return;
    const params = safeGetSearchParams();
    if (!params) return;
    const raw = params.get(keyRef.current);
    if (raw === null) {
      // seed URL with default only when default is non-null
      const normalized = initial === null ? null : normalize ? normalize(initial) : initial;
      if (normalized === null) {
        params.delete(keyRef.current);
        applyUrl(params, actionRef.current);
        setState(null);
      } else {
        const seeded = format(normalized);
        if (seeded === '') {
          params.delete(keyRef.current);
        } else {
          params.set(keyRef.current, seeded);
        }
        applyUrl(params, actionRef.current);
        setState(normalized);
      }
      return;
    }
    const parsed = parse(raw);
    const value = parsed !== null ? parsed : initial;
    if (value === null) {
      setState(null);
    } else {
      setState(normalize ? normalize(value) : value);
    }
  }, [initial]);

  // Listen to back/forward navigation to keep state in sync
  useEffect(() => {
    if (!isBrowser()) return;
    const handler = () => {
      const params = safeGetSearchParams();
      if (!params) return;
      const raw = params.get(keyRef.current);
      if (raw === null) return; // keep current
      const parsed = parse(raw);
      if (parsed !== null) {
        const next = normalize ? normalize(parsed) : parsed;
        const prev = stateRef.current as T | null;
        setState(next);
        dispatchQSChange({
          key: keyRef.current,
          prev,
          next,
          params: Object.fromEntries(params.entries()),
          source: 'popstate',
          ts: Date.now(),
        });
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [parse, normalize]);

  const setBoth: Updater<T | null> = useCallback(
    (value) => {
      setState((prev) => {
        const rawNext = typeof value === 'function' ? (value as (p: T | null) => T | null)(prev) : value;
        const next = rawNext === null ? null : normalize ? normalize(rawNext) : rawNext;
        const params = safeGetSearchParams();
        if (params) {
          const nextStr = format(next as T | null);
          const currentStr = params.get(keyRef.current);
          if (nextStr === '') {
            if (currentStr !== null) {
              params.delete(keyRef.current);
              applyUrl(params, actionRef.current);
              dispatchQSChange({
                key: keyRef.current,
                prev,
                next,
                params: Object.fromEntries(params.entries()),
                source: 'set',
                ts: Date.now(),
              });
            }
          } else if (currentStr !== nextStr) {
            params.set(keyRef.current, nextStr);
            applyUrl(params, actionRef.current);
            dispatchQSChange({
              key: keyRef.current,
              prev,
              next,
              params: Object.fromEntries(params.entries()),
              source: 'set',
              ts: Date.now(),
            });
          }
        }
        return next;
      });
    },
    [format, normalize],
  );

  return [state, setBoth];
}

/**
 * Internal generic hook that wires a single query key to React state (non-nullable version).
 *
 * Behavior:
 * - On mount, initialize from the URL (or seed with default if missing)
 * - On updates via the setter, update both state and the URL param
 * - On browser navigation (popstate), re-parse the URL and update state
 * - Never returns null - always uses the default value when parsing fails
 *
 * @template T Value type
 * @param key Query string key (e.g., "amount")
 * @param defaultValue Default state used when the key is missing/invalid in the URL (cannot be null)
 * @param parse Function to parse the raw string into T. Return `null` to fall back to the default.
 * @param format Function to format T back into a query‑string friendly string.
 * @param normalize Optional post-parse normalization applied to every value before being stored
 * @returns A tuple `[state, setState]` with a React‑style setter that also syncs the URL
 */
function useQueryParamNonNull<T>(
  key: string,
  defaultValue: T,
  parse: (raw: string) => T | null,
  format: (value: T) => string,
  normalize?: (value: T) => T,
  opts?: ActionOpts,
): [T, Updater<T>] {
  const initial = useMemo(() => defaultValue, []);
  const [state, setState] = useState<T>(initial);
  const keyRef = useRef(key);
  keyRef.current = key;
  const actionRef = useRef<HistoryAction>(opts?.action ?? 'replace');
  actionRef.current = opts?.action ?? actionRef.current;

  // keep a ref to the latest state for popstate comparisons
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize from URL, and ensure default in URL if absent
  useEffect(() => {
    if (!isBrowser()) return;
    const params = safeGetSearchParams();
    if (!params) return;
    const raw = params.get(keyRef.current);
    if (raw === null) {
      // seed URL with default
      const normalized = normalize ? normalize(initial) : initial;
      const seeded = format(normalized);
      if (seeded !== '') {
        params.set(keyRef.current, seeded);
        applyUrl(params, actionRef.current);
      }
      setState(normalized);
      return;
    }
    const parsed = parse(raw);
    const value = parsed !== null ? parsed : initial;
    setState(normalize ? normalize(value) : value);
  }, [initial]);

  // Listen to back/forward navigation to keep state in sync
  useEffect(() => {
    if (!isBrowser()) return;
    const handler = () => {
      const params = safeGetSearchParams();
      if (!params) return;
      const raw = params.get(keyRef.current);
      if (raw === null) {
        // If the param is removed from URL, fallback to default
        const next = normalize ? normalize(initial) : initial;
        setState(next);
        dispatchQSChange({
          key: keyRef.current,
          prev: stateRef.current,
          next,
          params: Object.fromEntries(params.entries()),
          source: 'popstate',
          ts: Date.now(),
        });
        return;
      }
      const parsed = parse(raw);
      const next = parsed !== null ? (normalize ? normalize(parsed) : parsed) : (normalize ? normalize(initial) : initial);
      if (next !== stateRef.current) {
        const prev = stateRef.current;
        setState(next);
        dispatchQSChange({
          key: keyRef.current,
          prev,
          next,
          params: Object.fromEntries(params.entries()),
          source: 'popstate',
          ts: Date.now(),
        });
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [parse, normalize, initial]);

  const setBoth: Updater<T> = useCallback(
    (value) => {
      setState((prev) => {
        const rawNext = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        const next = normalize ? normalize(rawNext) : rawNext;
        const params = safeGetSearchParams();
        if (params) {
          const nextStr = format(next);
          const currentStr = params.get(keyRef.current);
          if (nextStr === '') {
            if (currentStr !== null) {
              params.delete(keyRef.current);
              applyUrl(params, actionRef.current);
              dispatchQSChange({
                key: keyRef.current,
                prev,
                next,
                params: Object.fromEntries(params.entries()),
                source: 'set',
                ts: Date.now(),
              });
            }
          } else if (currentStr !== nextStr) {
            params.set(keyRef.current, nextStr);
            applyUrl(params, actionRef.current);
            dispatchQSChange({
              key: keyRef.current,
              prev,
              next,
              params: Object.fromEntries(params.entries()),
              source: 'set',
              ts: Date.now(),
            });
          }
        }
        return next;
      });
    },
    [format, normalize],
  );

  return [state, setBoth];
}

// Option bags. Every property also accepts an explicit `undefined`, so callers
// compiled with `exactOptionalPropertyTypes` can forward their own optional props.
interface ActionOpts {
  action?: HistoryAction | undefined;
}

interface NumberOpts extends ActionOpts {
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
}

interface StringOpts extends ActionOpts {
  minLength?: number | undefined;
  maxLength?: number | undefined;
}

interface DateOpts extends ActionOpts {
  min?: Date | undefined;
  max?: Date | undefined;
}

interface JsonOpts<T> extends ActionOpts {
  validate?: ((value: unknown) => value is T) | undefined;
  omitEmpty?: ((value: T) => boolean) | undefined;
  stringify?: ((value: T) => string) | undefined;
  parse?: ((raw: string) => unknown) | undefined;
}

// Parse/format/normalize helpers shared by the non-nullable and `.optional()`
// variant of each builder.

/** Adapts a formatter for nullable state: `null` formats to '' (param removed). */
function nullable<T>(format: (value: T) => string): (value: T | null) => string {
  return (value) => (value === null ? '' : format(value));
}

function identity<T>(value: T): T {
  return value;
}

function parseNumber(raw: string): number | null {
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

function clampNumber(opts: NumberOpts | undefined): (value: number) => number {
  return (v) => {
    let x = v;
    if (typeof opts?.min === 'number') x = Math.max(opts.min, x);
    if (typeof opts?.max === 'number') x = Math.min(opts.max, x);
    if (typeof opts?.step === 'number' && isFinite(opts.step) && opts.step > 0) {
      const steps = Math.round(x / opts.step);
      x = steps * opts.step;
    }
    return x;
  };
}

function clampString(opts: StringOpts | undefined): (value: string) => string {
  return (v) => {
    let s = v;
    if (typeof opts?.maxLength === 'number') s = s.slice(0, Math.max(0, opts.maxLength));
    if (typeof opts?.minLength === 'number' && s.length < opts.minLength) {
      s = s.padEnd(opts.minLength, ' ');
    }
    return s;
  };
}

function parseBoolean(raw: string): boolean | null {
  const norm = raw.trim().toLowerCase();
  if (['1', 'true', 't', 'yes', 'y'].includes(norm)) return true;
  if (['0', 'false', 'f', 'no', 'n'].includes(norm)) return false;
  return null;
}

function formatBoolean(value: boolean): string {
  return value ? '1' : '0';
}

function parseDate(raw: string): Date | null {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value: Date): string {
  const yyyy = value.getUTCFullYear();
  const mm = String(value.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(value.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function clampDate(opts: DateOpts | undefined): (value: Date) => Date {
  return (v) => {
    let d = v;
    if (opts?.min && d < opts.min) d = opts.min;
    if (opts?.max && d > opts.max) d = opts.max;
    return d;
  };
}

function parseEnum<U extends string>(allowed: readonly U[]): (raw: string) => U | null {
  return (raw) => (allowed.includes(raw as U) ? (raw as U) : null);
}

function jsonCodec<T>(opts: JsonOpts<T> | undefined) {
  return {
    parse: (raw: string): T | null => {
      try {
        const parsed = opts?.parse ? opts.parse(raw) : JSON.parse(raw);
        if (opts?.validate) {
          return opts.validate(parsed) ? (parsed as T) : null;
        }
        return parsed as T;
      } catch {
        return null;
      }
    },
    format: (value: T): string => {
      if (opts?.omitEmpty && opts.omitEmpty(value)) return '';
      try {
        return opts?.stringify ? opts.stringify(value) : JSON.stringify(value);
      } catch {
        return '';
      }
    },
  };
}

// Builder interfaces for each data type
interface NumberBuilder {
  /**
   * Creates a non-nullable number state bound to a query param.
   *
   * @param defaultValue Required default value when the param is missing/invalid
   * @param opts Optional constraints and history action
   * @returns A tuple `[value, setValue]` where value is never null
   */
  (defaultValue: number, opts?: NumberOpts): [number, Updater<number>];

  /**
   * Creates a nullable number state bound to a query param.
   *
   * @param defaultValue Optional default value (defaults to null)
   * @param opts Optional constraints and history action
   * @returns A tuple `[value, setValue]` where value can be null
   */
  optional(defaultValue?: number | null, opts?: NumberOpts): [number | null, Updater<number | null>];
}

interface StringBuilder {
  /**
   * Creates a non-nullable string state bound to a query param.
   *
   * @param defaultValue Required default value when the param is missing
   * @param opts Optional length constraints and history action
   * @returns A tuple `[value, setValue]` where value is never null
   */
  (defaultValue: string, opts?: StringOpts): [string, Updater<string>];

  /**
   * Creates a nullable string state bound to a query param.
   *
   * @param defaultValue Optional default value (defaults to null)
   * @param opts Optional length constraints and history action
   * @returns A tuple `[value, setValue]` where value can be null
   */
  optional(defaultValue?: string | null, opts?: StringOpts): [string | null, Updater<string | null>];
}

interface BooleanBuilder {
  /**
   * Creates a non-nullable boolean state bound to a query param.
   *
   * @param defaultValue Required default value when the param is missing
   * @param opts Optional history action
   * @returns A tuple `[value, setValue]` where value is never null
   */
  (defaultValue: boolean, opts?: ActionOpts): [boolean, Updater<boolean>];

  /**
   * Creates a nullable boolean state bound to a query param.
   *
   * @param defaultValue Optional default value (defaults to null)
   * @param opts Optional history action
   * @returns A tuple `[value, setValue]` where value can be null
   */
  optional(defaultValue?: boolean | null, opts?: ActionOpts): [boolean | null, Updater<boolean | null>];
}

interface DateBuilder {
  /**
   * Creates a non-nullable Date state bound to a query param.
   *
   * @param defaultValue Required default value when the param is missing/invalid
   * @param opts Optional min/max clamping and history action
   * @returns A tuple `[value, setValue]` where value is never null
   */
  (defaultValue: Date, opts?: DateOpts): [Date, Updater<Date>];

  /**
   * Creates a nullable Date state bound to a query param.
   *
   * @param defaultValue Optional default value (defaults to null)
   * @param opts Optional min/max clamping and history action
   * @returns A tuple `[value, setValue]` where value can be null
   */
  optional(defaultValue?: Date | null, opts?: DateOpts): [Date | null, Updater<Date | null>];
}

interface EnumBuilder<U extends string> {
  /**
   * Creates a non-nullable enum state bound to a query param.
   *
   * @param allowed Array of allowed string values
   * @param defaultValue Required default value when the param is not in allowed list
   * @param opts Optional history action
   * @returns A tuple `[value, setValue]` where value is never null
   */
  (allowed: readonly U[], defaultValue: U, opts?: ActionOpts): [U, Updater<U>];

  /**
   * Creates a nullable enum state bound to a query param.
   *
   * @param allowed Array of allowed string values
   * @param defaultValue Optional default value (defaults to null)
   * @param opts Optional history action
   * @returns A tuple `[value, setValue]` where value can be null
   */
  optional(allowed: readonly U[], defaultValue?: U | null, opts?: ActionOpts): [U | null, Updater<U | null>];
}

interface CustomBuilder<T> {
  /**
   * Creates a non-nullable custom state bound to a query param.
   *
   * @param defaultValue Required default value when parsing fails
   * @param parse Function parsing the raw string into T (return null on failure)
   * @param format Function formatting T into a string
   * @param opts Optional history action
   * @returns A tuple `[value, setValue]` where value is never null
   */
  (
    defaultValue: T,
    parse: (raw: string) => T | null,
    format: (value: T) => string,
    opts?: ActionOpts
  ): [T, Updater<T>];

  /**
   * Creates a nullable custom state bound to a query param.
   *
   * @param defaultValue Optional default value (defaults to null)
   * @param parse Function parsing the raw string into T (return null on failure)
   * @param format Function formatting T into a string (null values result in empty string)
   * @param opts Optional history action
   * @returns A tuple `[value, setValue]` where value can be null
   */
  optional(
    defaultValue: T | null,
    parse: (raw: string) => T | null,
    format: (value: T | null) => string,
    opts?: ActionOpts
  ): [T | null, Updater<T | null>];
}

interface JsonBuilder<T> {
  /**
   * Creates a non-nullable JSON state bound to a query param.
   *
   * @param defaultValue Required default value when parsing fails
   * @param opts Optional validation, omitEmpty, custom serializers, and history action
   * @returns A tuple `[value, setValue]` where value is never null
   */
  (defaultValue: T, opts?: JsonOpts<T>): [T, Updater<T>];

  /**
   * Creates a nullable JSON state bound to a query param.
   *
   * @param defaultValue Optional default value (defaults to null)
   * @param opts Optional validation, omitEmpty, custom serializers, and history action
   * @returns A tuple `[value, setValue]` where value can be null
   */
  optional(defaultValue?: T | null, opts?: JsonOpts<T>): [T | null, Updater<T | null>];
}

/**
 * Public API: returns builder methods for creating typed query‑state pairs.
 *
 * Pattern:
 *   const [value, setValue] = useShareableState('key').number(123); // non-nullable
 *   const [value, setValue] = useShareableState('key').number().optional(); // nullable
 *
 * Available builders:
 * - number(defaultValue): number (non-nullable) | number().optional(): number | null
 * - string(defaultValue): string (non-nullable) | string().optional(): string | null
 * - boolean(defaultValue): boolean (non-nullable) | boolean().optional(): boolean | null
 * - date(defaultValue): Date (non-nullable) | date().optional(): Date | null
 * - enum<U>(allowed, defaultValue): U (non-nullable) | enum<U>().optional(allowed): U | null
 * - custom<T>(defaultValue, parse, format): T (non-nullable) | custom<T>().optional(): T | null
 * - json<T>(defaultValue): T (non-nullable) | json<T>().optional(): T | null
 */
export function useShareableState(key: string) {
  // Each builder is callable for the non-nullable variant and exposes `.optional()`
  // for the nullable one. The `xxxFn` overloads below add the zero-argument call
  // (`.number()`) that returns the builder, enabling `.number().optional()`.
  const numberBuilder: NumberBuilder = Object.assign(
    (defaultValue: number, opts?: NumberOpts) =>
      useQueryParamNonNull<number>(key, defaultValue, parseNumber, String, clampNumber(opts), opts),
    {
      optional: (defaultValue: number | null = null, opts?: NumberOpts) =>
        useQueryParam<number>(key, defaultValue, parseNumber, nullable<number>(String), clampNumber(opts), opts),
    },
  );

  const stringBuilder: StringBuilder = Object.assign(
    (defaultValue: string, opts?: StringOpts) =>
      useQueryParamNonNull<string>(key, defaultValue, identity, identity, clampString(opts), opts),
    {
      optional: (defaultValue: string | null = null, opts?: StringOpts) =>
        useQueryParam<string>(key, defaultValue, identity, nullable<string>(identity), clampString(opts), opts),
    },
  );

  const booleanBuilder: BooleanBuilder = Object.assign(
    (defaultValue: boolean, opts?: ActionOpts) =>
      useQueryParamNonNull<boolean>(key, defaultValue, parseBoolean, formatBoolean, undefined, opts),
    {
      optional: (defaultValue: boolean | null = null, opts?: ActionOpts) =>
        useQueryParam<boolean>(key, defaultValue, parseBoolean, nullable(formatBoolean), undefined, opts),
    },
  );

  const dateBuilder: DateBuilder = Object.assign(
    (defaultValue: Date, opts?: DateOpts) =>
      useQueryParamNonNull<Date>(key, defaultValue, parseDate, formatDate, clampDate(opts), opts),
    {
      optional: (defaultValue: Date | null = null, opts?: DateOpts) =>
        useQueryParam<Date>(key, defaultValue, parseDate, nullable(formatDate), clampDate(opts), opts),
    },
  );

  function numberFn(defaultValue: number, opts?: NumberOpts): [number, Updater<number>];
  function numberFn(): NumberBuilder;
  function numberFn(defaultValue?: number, opts?: NumberOpts): [number, Updater<number>] | NumberBuilder {
    return defaultValue === undefined ? numberBuilder : numberBuilder(defaultValue, opts);
  }

  function stringFn(defaultValue: string, opts?: StringOpts): [string, Updater<string>];
  function stringFn(): StringBuilder;
  function stringFn(defaultValue?: string, opts?: StringOpts): [string, Updater<string>] | StringBuilder {
    return defaultValue === undefined ? stringBuilder : stringBuilder(defaultValue, opts);
  }

  function booleanFn(defaultValue: boolean, opts?: ActionOpts): [boolean, Updater<boolean>];
  function booleanFn(): BooleanBuilder;
  function booleanFn(defaultValue?: boolean, opts?: ActionOpts): [boolean, Updater<boolean>] | BooleanBuilder {
    return defaultValue === undefined ? booleanBuilder : booleanBuilder(defaultValue, opts);
  }

  function dateFn(defaultValue: Date, opts?: DateOpts): [Date, Updater<Date>];
  function dateFn(): DateBuilder;
  function dateFn(defaultValue?: Date, opts?: DateOpts): [Date, Updater<Date>] | DateBuilder {
    return defaultValue === undefined ? dateBuilder : dateBuilder(defaultValue, opts);
  }

  function enumFn<U extends string>(allowed: readonly U[], defaultValue: U, opts?: ActionOpts): [U, Updater<U>];
  function enumFn<U extends string>(): EnumBuilder<U>;
  function enumFn<U extends string>(
    allowed?: readonly U[],
    defaultValue?: U,
    opts?: ActionOpts,
  ): [U, Updater<U>] | EnumBuilder<U> {
    const enumBuilder: EnumBuilder<U> = Object.assign(
      (allowed: readonly U[], defaultValue: U, opts?: ActionOpts) =>
        useQueryParamNonNull<U>(key, defaultValue, parseEnum(allowed), identity, undefined, opts),
      {
        optional: (allowed: readonly U[], defaultValue: U | null = null, opts?: ActionOpts) =>
          useQueryParam<U>(key, defaultValue, parseEnum(allowed), nullable<U>(identity), undefined, opts),
      },
    );
    return allowed !== undefined && defaultValue !== undefined
      ? enumBuilder(allowed, defaultValue, opts)
      : enumBuilder;
  }

  function customFn<T>(
    defaultValue: T,
    parse: (raw: string) => T | null,
    format: (value: T) => string,
    opts?: ActionOpts,
  ): [T, Updater<T>];
  function customFn<T>(): CustomBuilder<T>;
  function customFn<T>(
    defaultValue?: T,
    parse?: (raw: string) => T | null,
    format?: (value: T) => string,
    opts?: ActionOpts,
  ): [T, Updater<T>] | CustomBuilder<T> {
    const customBuilder: CustomBuilder<T> = Object.assign(
      (defaultValue: T, parse: (raw: string) => T | null, format: (value: T) => string, opts?: ActionOpts) =>
        useQueryParamNonNull<T>(key, defaultValue, parse, format, undefined, opts),
      {
        optional: (
          defaultValue: T | null,
          parse: (raw: string) => T | null,
          format: (value: T | null) => string,
          opts?: ActionOpts,
        ) => useQueryParam<T>(key, defaultValue, parse, format, undefined, opts),
      },
    );
    // parse/format are required in the non-nullable form; defaultValue itself may be undefined
    return parse !== undefined && format !== undefined
      ? customBuilder(defaultValue as T, parse, format, opts)
      : customBuilder;
  }

  function jsonFn<T>(defaultValue: T, opts?: JsonOpts<T>): [T, Updater<T>];
  function jsonFn<T>(): JsonBuilder<T>;
  function jsonFn<T>(defaultValue?: T, opts?: JsonOpts<T>): [T, Updater<T>] | JsonBuilder<T> {
    const jsonBuilder: JsonBuilder<T> = Object.assign(
      (defaultValue: T, opts?: JsonOpts<T>) => {
        const codec = jsonCodec(opts);
        return useQueryParamNonNull<T>(key, defaultValue, codec.parse, codec.format, undefined, opts);
      },
      {
        optional: (defaultValue: T | null = null, opts?: JsonOpts<T>) => {
          const codec = jsonCodec(opts);
          return useQueryParam<T>(key, defaultValue, codec.parse, nullable(codec.format), undefined, opts);
        },
      },
    );
    return defaultValue !== undefined ? jsonBuilder(defaultValue, opts) : jsonBuilder;
  }

  return {
    /**
     * Number state builder. Use .number(defaultValue) for non-nullable or .number().optional() for nullable.
     *
     * @example
     * const [count, setCount] = useShareableState('count').number(0); // non-nullable
     * const [optional, setOptional] = useShareableState('opt').number().optional(); // nullable
     *
     * `.number.optional()` predates `.number().optional()` and keeps working for existing callers.
     */
    number: Object.assign(numberFn, { optional: numberBuilder.optional }),

    /**
     * String state builder. Use .string(defaultValue) for non-nullable or .string().optional() for nullable.
     *
     * @example
     * const [name, setName] = useShareableState('name').string(''); // non-nullable
     * const [optional, setOptional] = useShareableState('opt').string().optional(); // nullable
     */
    string: stringFn,

    /**
     * Boolean state builder. Use .boolean(defaultValue) for non-nullable or .boolean().optional() for nullable.
     *
     * @example
     * const [active, setActive] = useShareableState('active').boolean(false); // non-nullable
     * const [optional, setOptional] = useShareableState('opt').boolean().optional(); // nullable
     *
     * `.boolean.optional()` predates `.boolean().optional()` and keeps working for existing callers.
     */
    boolean: Object.assign(booleanFn, { optional: booleanBuilder.optional }),

    /**
     * Date state builder. Use .date(defaultValue) for non-nullable or .date().optional() for nullable.
     *
     * @example
     * const [start, setStart] = useShareableState('start').date(new Date()); // non-nullable
     * const [optional, setOptional] = useShareableState('opt').date().optional(); // nullable
     */
    date: dateFn,

    /**
     * Enum state builder. Binds a string literal union (enum-like) to a query param.
     *
     * @template U extends string
     * @example
     * type Theme = 'light' | 'dark';
     * const [theme, setTheme] = useShareableState('theme').enum<Theme>(['light','dark'], 'light'); // non-nullable
     * const [optional, setOptional] = useShareableState('opt').enum<Theme>().optional(['light','dark']); // nullable
     */
    enum: enumFn,

    /**
     * Custom state builder. Provide your own parse/format functions.
     *
     * @template T
     * @example
     * const [ids, setIds] = useShareableState('ids').custom<number[]>([], parse, format); // non-nullable
     * const [optional, setOptional] = useShareableState('opt').custom<number[]>().optional(null, parse, format); // nullable
     */
    custom: customFn,

    /**
     * JSON state builder. Binds a JSON-serializable value to a query param.
     *
     * @template T
     * @example
     * const [data, setData] = useShareableState('data').json<{q: string}>({q: ''}); // non-nullable
     * const [optional, setOptional] = useShareableState('opt').json<{q: string}>().optional(); // nullable
     */
    json: jsonFn,
  } as const;
}
