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
 * Examples:
 *
 * 1) Number
 *   const [amount, setAmount] = useShareableState('amount').number(1000);
 *   setAmount(1500); // updates state AND ?amount=1500
 *
 * 2) Date (ISO yyyy-MM-dd in URL)
 *   const [start, setStart] = useShareableState('start').date(new Date('2020-01-01'));
 *   setStart(new Date('2021-06-15')); // updates state AND ?start=2021-06-15
 *
 * 3) Enum
 *   type Index = 'us_cpi' | 'uk_rpi' | 'euro_hicp' | 'can_cpi' | 'aus_cpi';
 *   const [index, setIndex] = useShareableState('index').enum<Index>(
 *     ['us_cpi', 'uk_rpi', 'euro_hicp', 'can_cpi', 'aus_cpi'],
 *     'us_cpi'
 *   );
 *
 * 4) Custom parser/formatter
 *   const [arr, setArr] = useShareableState('list').custom<number[]>([1,2,3],
 *     raw => { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : null; } catch { return null; } },
 *     v => JSON.stringify(v)
 *   );
 *
 * 5) JSON
 *   const [filters, setFilters] = useShareableState('f').json<{ q: string }>({ q: '' });
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
 * Internal generic hook that wires a single query key to React state.
 *
 * Behavior:
 * - On mount, initialize from the URL (or seed with default if missing)
 * - On updates via the setter, update both state and the URL param
 * - On browser navigation (popstate), re-parse the URL and update state
 *
 * @template T Value type
 * @param key Query string key (e.g., "amount")
 * @param defaultValue Default state used when the key is missing/invalid in the URL
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
  opts?: { action?: HistoryAction },
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
  }, [parse]);

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
    [format],
  );

  return [state, setBoth];
}

/**
 * Public API: returns builder methods for creating typed query‑state pairs.
 *
 * Pattern:
 *   const [value, setValue] = useShareableState('key').number(123);
 *
 * Available builders:
 * - number(defaultValue): number
 * - string(defaultValue): string
 * - boolean(defaultValue): boolean (stored as '1' | '0')
 * - date(defaultValue): Date (stored as 'yyyy-MM-dd')
 * - enum(allowed, defaultValue): U extends string
 * - custom(defaultValue, parse, format): T
 */
export function useShareableState(key: string) {
  return {
    /**
     * Binds a number state to a query param. Invalid/NaN values fall back to default.
     *
     * The number is stored as a base-10 string in the URL. You can optionally
     * constrain and normalize the value using `min`, `max` and `step`.
     *
     * @param defaultValue Initial value when the param is missing/invalid
     * @param opts Optional constraints
     * @param opts.min Minimum allowed value (values below are clamped)
     * @param opts.max Maximum allowed value (values above are clamped)
     * @param opts.step Rounds to the nearest multiple of this step (must be > 0)
     * @param opts.action History action to use when updating the URL (push or replace)
     * @returns A tuple `[value, setValue]`
     * @example
     * const [n, setN] = useShareableState('n').number(0, { min: 0, step: 1 });
     */
    number(
      defaultValue: number | null,
      opts?: { min?: number; max?: number; step?: number; action?: HistoryAction },
    ): [number | null, Updater<number | null>] {
      return useQueryParam<number | null>(
        key,
        defaultValue,
        (raw) => {
          const n = Number(raw);
          return isNaN(n) ? null : n;
        },
        (v) => (v === null ? '' : String(v)),
        (v) => {
          if (v === null) return v;
          let x = v;
          if (typeof opts?.min === 'number') x = Math.max(opts.min, x);
          if (typeof opts?.max === 'number') x = Math.min(opts.max, x);
          if (typeof opts?.step === 'number' && isFinite(opts.step) && opts.step > 0) {
            const steps = Math.round(x / opts.step);
            x = steps * opts.step;
          }
          return x;
        },
        opts?.action !== undefined ? { action: opts.action } : undefined,
      );
    },
    /**
     * Binds a string state to a query param. No transformation is applied.
     *
     * Use `minLength`/`maxLength` to coerce/pad or slice the string. An empty string
     * removes the query param from the URL.
     *
     * @param defaultValue Initial value when the param is missing
     * @param opts Optional length constraints and history action
     * @param opts.minLength Minimum allowed length (strings shorter are padded)
     * @param opts.maxLength Maximum allowed length (strings longer are truncated)
     * @param opts.action History action to use when updating the URL (push or replace)
     * @returns A tuple `[value, setValue]`
     * @example
     * const [q, setQ] = useShareableState('q').string('');
     */
    string(
      defaultValue: string | null,
      opts?: { minLength?: number; maxLength?: number; action?: HistoryAction },
    ): [string | null, Updater<string | null>] {
      return useQueryParam<string | null>(
        key,
        defaultValue,
        (raw) => raw,
        (v) => (v === null ? '' : v),
        (v) => {
          if (v === null) return v;
          let s = v ?? '';
          if (typeof opts?.maxLength === 'number') s = s.slice(0, Math.max(0, opts.maxLength));
          if (typeof opts?.minLength === 'number' && s.length < opts.minLength) {
            // pad with spaces if needed (simple strategy)
            s = s.padEnd(opts.minLength, ' ');
          }
          return s;
        },
        opts?.action !== undefined ? { action: opts.action } : undefined,
      );
    },
    /**
     * Binds a boolean state to a query param, using '1' and '0' representations.
     * Accepts common truthy/falsy string variants when parsing.
     *
     * @param defaultValue Initial boolean when the param is missing
     * @param opts Optional history action
     * @param opts.action History action to use when updating the URL (push or replace)
     * @returns A tuple `[value, setValue]`
     * @example
     * const [open, setOpen] = useShareableState('open').boolean(false);
     */
    boolean(defaultValue: boolean | null, opts?: { action?: HistoryAction }): [boolean | null, Updater<boolean | null>] {
      return useQueryParam<boolean | null>(
        key,
        defaultValue,
        (raw) => {
          const norm = raw.trim().toLowerCase();
          if (['1', 'true', 't', 'yes', 'y'].includes(norm)) return true;
          if (['0', 'false', 'f', 'no', 'n'].includes(norm)) return false;
          return null;
        },
        (v) => (v === null ? '' : v ? '1' : '0'),
        undefined,
        opts?.action !== undefined ? { action: opts.action } : undefined,
      );
    },
    /**
     * Binds a Date state to a query param, persisted as 'yyyy-MM-dd'.
     *
     * @param defaultValue Initial date when the param is missing/invalid
     * @param opts Optional min/max clamping and history action
     * @param opts.min Minimum allowed date (dates before are clamped)
     * @param opts.max Maximum allowed date (dates after are clamped)
     * @param opts.action History action to use when updating the URL (push or replace)
     * @returns A tuple `[value, setValue]`
     * @example
     * const [start, setStart] = useShareableState('start').date(new Date());
     */
    date(defaultValue: Date | null, opts?: { min?: Date; max?: Date; action?: HistoryAction }): [Date | null, Updater<Date | null>] {
      return useQueryParam<Date | null>(
        key,
        defaultValue,
        (raw) => {
          const d = new Date(raw);
          return isNaN(d.getTime()) ? null : d;
        },
        (v) => {
          if (v === null) return '';
          const yyyy = v.getUTCFullYear();
          const mm = String(v.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(v.getUTCDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        },
        (v) => {
          if (v === null) return v;
          let d = v;
          if (opts?.min && d < opts.min) d = opts.min;
          if (opts?.max && d > opts.max) d = opts.max;
          return d;
        },
        opts?.action !== undefined ? { action: opts.action } : undefined,
      );
    },
    /**
     * Binds a string literal union (enum-like) to a query param.
     * If the URL value is not within the allowed list, the default is used.
     *
     * @template U extends string
     * @param allowed Array of allowed string values
     * @param defaultValue Fallback used when the URL value is not allowed
     * @param opts Optional history action
     * @param opts.action History action to use when updating the URL (push or replace)
     * @returns A tuple `[value, setValue]`
     * @example
     * type Theme = 'light' | 'dark';
     * const [theme, setTheme] = useShareableState('t').enum<Theme>(['light','dark'], 'light');
     */
    enum<U extends string>(allowed: readonly U[], defaultValue: U | null, opts?: { action?: HistoryAction }): [U | null, Updater<U | null>] {
      return useQueryParam<U | null>(
        key,
        defaultValue,
        (raw) => (allowed.includes(raw as U) ? (raw as U) : null),
        (v) => (v === null ? '' : v),
        undefined,
        opts?.action !== undefined ? { action: opts.action } : undefined,
      );
    },
    /**
     * Fully custom binding. Provide your own parse/format functions.
     * Return null from parse to indicate an invalid/unsupported value and fall back to default.
     *
     * @template T
     * @param defaultValue Fallback when the URL value cannot be parsed
     * @param parse Function parsing the raw string into T (return `null` on failure)
     * @param format Function formatting T into a string (return empty string to delete param)
     * @param opts Optional history action
     * @param opts.action History action to use when updating the URL (push or replace)
     * @returns A tuple `[value, setValue]`
     * @example
     * const [ids, setIds] = useShareableState('ids').custom<number[]>([],
     *   raw => raw.split(',').map(Number).filter(Number.isFinite),
     *   v => v.join(',')
     * );
     */
    custom<T>(
      defaultValue: T | null,
      parse: (raw: string) => T | null,
      format: (value: T | null) => string,
      opts?: { action?: HistoryAction },
    ): [T | null, Updater<T | null>] {
      return useQueryParam<T | null>(
        key,
        defaultValue,
        parse,
        format,
        undefined,
        opts?.action !== undefined ? { action: opts.action } : undefined,
      );
    },
    /**
     * Binds a JSON-serializable value (object/array) to a query param.
     * You can optionally provide a validator to ensure shape and an omitEmpty function
     * to clear the param when the value is considered empty.
     *
     * @template T
     * @param defaultValue Initial value when the param is missing
     * @param opts Optional configuration
     * @param opts.validate Type guard to validate parsed JSON (return false to fall back)
     * @param opts.omitEmpty When returns true, the param is deleted from the URL
     * @param opts.stringify Custom JSON serializer
     * @param opts.parse Custom JSON parser
     * @param opts.action History action to use when updating the URL (push or replace)
     * @returns A tuple `[value, setValue]`
     * @example
     * const [filters, setFilters] = useShareableState('f').json<{ q: string }>({ q: '' });
     */
    json<T>(
      defaultValue: T | null,
      opts?: {
        validate?: (value: unknown) => value is T;
        omitEmpty?: (value: T) => boolean; // when true, param is deleted
        stringify?: (value: T) => string; // custom JSON stringify
        parse?: (raw: string) => unknown; // custom JSON parse
        action?: HistoryAction;
      },
    ): [T | null, Updater<T | null>] {
      const parseJson = (raw: string): T | null => {
        try {
          const parsed = opts?.parse ? opts.parse(raw) : JSON.parse(raw);
          if (opts?.validate) {
            return opts.validate(parsed) ? (parsed as T) : null;
          }
          return parsed as T;
        } catch {
          return null;
        }
      };
      const formatJson = (value: T | null): string => {
        if (value === null) return '';
        if (opts?.omitEmpty && opts.omitEmpty(value)) return '';
        try {
          return opts?.stringify ? opts.stringify(value) : JSON.stringify(value);
        } catch {
          return '';
        }
      };
      return useQueryParam<T | null>(
        key,
        defaultValue,
        parseJson,
        formatJson,
        undefined,
        opts?.action !== undefined ? { action: opts.action } : undefined,
      );
    },
  } as const;
}
