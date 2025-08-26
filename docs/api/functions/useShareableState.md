[**@gawryco/use-shareable-state**](../README.md)

---

[@gawryco/use-shareable-state](../README.md) / useShareableState

# Function: useShareableState()

> **useShareableState**(`key`): `object`

Defined in: [useShareableState.ts:283](https://github.com/gawryco/use-shareable-state/blob/02c840459e0453e23885348e21ffdad11f984939/src/useShareableState.ts#L283)

## Overview

`useShareableState` is a React hook that creates bidirectional synchronization between React component state and URL query parameters. It transforms your app into a **shareable, bookmarkable experience** with zero boilerplate.

**Core Philosophy**: One line of code should handle state management, URL synchronization, type safety, and browser navigation.

## Quick Example

```tsx
import { useShareableState } from '@gawryco/use-shareable-state';

function SearchPage() {
  // ✨ This single line handles everything:
  // - React state management
  // - URL synchronization
  // - Type safety (string)
  // - Browser back/forward navigation
  // - Bookmarkable URLs
  const [query, setQuery] = useShareableState('q').string('');

  return <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />;
}
```

**Result**: URL automatically updates to `?q=react` when user types "react", and the component state stays in sync with browser navigation.

## Design Principles

### 🎯 **Type-First Architecture**

Every builder method provides full TypeScript inference. No manual casting or type guards needed.

### ⚡ **Performance Optimized**

- Only affected components re-render when URL changes
- Smart diffing prevents unnecessary updates
- Efficient parsing only when URL actually changes

### 🌐 **Framework Agnostic**

Pure URL manipulation that works with any React setup: Next.js, Remix, Vite, Create React App, or custom SSR solutions.

### 🔄 **Browser Navigation Ready**

Automatically handles `popstate` events, keeping state synchronized with browser back/forward buttons.

## Builder Pattern

`useShareableState('key')` returns an object with builder methods for different data types:

```tsx
// Available builders:
const builders = useShareableState('key');

builders.string(defaultValue)   // → [string | null, Setter<string | null>]
builders.number(defaultValue)   // → [number | null, Setter<number | null>]
builders.boolean(defaultValue)  // → [boolean | null, Setter<boolean | null>]
builders.date(defaultValue)     // → [Date | null, Setter<Date | null>]
builders.enum(allowed, default) // → [T | null, Setter<T | null>]
builders.json<T>(defaultValue)  // → [T | null, Setter<T | null>]
builders.custom<T>(def, parse, format) // → [T | null, Setter<T | null>]
```

## Common Patterns

### 1. **Search & Filtering**

```tsx
function ProductFilter() {
  const [search, setSearch] = useShareableState('q').string('');
  const [category, setCategory] = useShareableState('cat').enum(
    ['electronics', 'clothing', 'books'] as const,
    'electronics',
  );
  const [minPrice, setMinPrice] = useShareableState('min').number(0, { min: 0 });

  // URL: ?q=laptop&cat=electronics&min=500
  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="books">Books</option>
      </select>
      <input type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} />
    </div>
  );
}
```

### 2. **Optional Parameters (Null Defaults)**

Use `null` as the default to omit parameters from the URL until explicitly set:

```tsx
function OptionalFilters() {
  // Parameters only appear in URL when set to non-null values
  const [search, setSearch] = useShareableState('q').string(null);
  const [sort, setSort] = useShareableState('sort').enum(['name', 'date', 'price'], null);

  // URL progression:
  // Initially: (no params)
  // After search: ?q=laptop
  // After sort: ?q=laptop&sort=price

  return (
    <div>
      <input
        value={search ?? ''}
        onChange={(e) => setSearch(e.target.value || null)}
        placeholder="Search..."
      />
      <select value={sort ?? ''} onChange={(e) => setSort((e.target.value as any) || null)}>
        <option value="">Default</option>
        <option value="name">Name</option>
        <option value="date">Date</option>
        <option value="price">Price</option>
      </select>
    </div>
  );
}
```

### 3. **Complex State with JSON**

For objects and arrays, use the `json()` builder:

```tsx
interface TableState {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  visibleColumns: string[];
}

function DataTable() {
  const [tableState, setTableState] = useShareableState('table').json<TableState>(
    { sortBy: 'name', sortOrder: 'asc', visibleColumns: ['name', 'email'] },
    {
      // Optional: validate parsed JSON
      validate: (obj): obj is TableState =>
        typeof obj === 'object' && obj !== null && 'sortBy' in obj,

      // Optional: clean URLs by omitting default values
      omitEmpty: (state) =>
        state.sortBy === 'name' && state.sortOrder === 'asc' && state.visibleColumns.length === 2,
    },
  );

  const toggleSort = (column: string) => {
    setTableState((prev) => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <table>
      <thead>
        <tr>
          {tableState.visibleColumns.map((col) => (
            <th key={col} onClick={() => toggleSort(col)}>
              {col} {tableState.sortBy === col && (tableState.sortOrder === 'asc' ? '↑' : '↓')}
            </th>
          ))}
        </tr>
      </thead>
      {/* table body */}
    </table>
  );
}
```

### 4. **Custom Serialization**

For specialized data formats, use the `custom()` builder:

```tsx
// Example: Comma-separated tags
function TagFilter() {
  const [tags, setTags] = useShareableState('tags').custom<string[]>(
    [], // default value
    (raw) => (raw ? raw.split(',').filter(Boolean) : []), // parse function
    (tags) => (tags.length > 0 ? tags.join(',') : ''), // format function
  );

  const addTag = (tag: string) => setTags((prev) => [...prev, tag]);
  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  // URL: ?tags=react,typescript,hooks
  return (
    <div>
      {tags.map((tag) => (
        <span key={tag} onClick={() => removeTag(tag)}>
          {tag} ×
        </span>
      ))}
    </div>
  );
}
```

## Advanced Configuration

### History Actions

Control whether URL changes create new history entries:

```tsx
// Default: replace current URL (no new history entry)
const [search, setSearch] = useShareableState('q').string('');

// Create new history entries (enables step-by-step browser back)
const [search, setSearch] = useShareableState('q').string('', { action: 'push' });
```

### Constraints and Validation

Many builders accept options for validation and constraints:

```tsx
// Number with constraints
const [age, setAge] = useShareableState('age').number(25, {
  min: 0,
  max: 120,
  step: 1, // Round to nearest integer
});

// String with length limits
const [username, setUsername] = useShareableState('user').string('', {
  maxLength: 20,
  minLength: 3,
});

// Date with range constraints
const [startDate, setStartDate] = useShareableState('from').date(new Date(), {
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
});
```

## Performance Best Practices

### 1. **Stable Defaults**

Avoid creating new objects/arrays on every render:

```tsx
// ❌ New array created every render
const [items, setItems] = useShareableState('items').custom([], parse, format);

// ✅ Stable reference
const DEFAULT_ITEMS: string[] = [];
const [items, setItems] = useShareableState('items').custom(DEFAULT_ITEMS, parse, format);
```

### 2. **Debounce Frequent Updates**

For search inputs, debounce updates to avoid excessive URL changes:

```tsx
function SearchBox() {
  const [query, setQuery] = useShareableState('q').string('');
  const [localQuery, setLocalQuery] = useState(query);

  // Debounce URL updates
  useEffect(() => {
    const timer = setTimeout(() => setQuery(localQuery), 300);
    return () => clearTimeout(timer);
  }, [localQuery, setQuery]);

  return <input value={localQuery} onChange={(e) => setLocalQuery(e.target.value)} />;
}
```

### 3. **Split Large Objects**

Instead of one large JSON parameter, use multiple focused parameters:

```tsx
// ❌ Large object in single param
const [allSettings, setAllSettings] = useShareableState('settings').json(largeObject);

// ✅ Split by domain
const [uiSettings, setUiSettings] = useShareableState('ui').json(defaultUI);
const [apiSettings, setApiSettings] = useShareableState('api').json(defaultAPI);
const [userPrefs, setUserPrefs] = useShareableState('prefs').json(defaultPrefs);
```

## SSR Considerations

`useShareableState` is SSR-safe but requires careful handling of hydration:

```tsx
function SearchPage() {
  // During SSR, this returns the default value
  // After hydration, it reads from the actual URL
  const [query, setQuery] = useShareableState('q').string('');

  // For SSR apps, consider null defaults to avoid hydration mismatches
  const [category, setCategory] = useShareableState('cat').string(null);

  // Handle loading state during hydration
  if (category === null) {
    return <SearchSkeleton />;
  }

  return <SearchResults query={query} category={category} />;
}
```

## Event Monitoring

Listen to parameter changes across your app:

```tsx
useEffect(() => {
  const handleChange = (event: CustomEvent) => {
    const { key, prev, next, source, ts } = event.detail;
    console.log(`Parameter "${key}" changed from "${prev}" to "${next}"`);

    // Track analytics, update caches, etc.
  };

  window.addEventListener('qs:changed', handleChange);
  return () => window.removeEventListener('qs:changed', handleChange);
}, []);
```

## Troubleshooting

### Component Not Updating on Browser Navigation

**Solution**: Ensure the component remains mounted and the hook is called in every render:

```tsx
// ✅ Hook called in component body
function SearchPage() {
  const [query, setQuery] = useShareableState('q').string('');
  return <SearchResults query={query} />;
}

// ❌ Hook called conditionally
function SearchPage() {
  const [showSearch, setShowSearch] = useState(true);

  if (showSearch) {
    const [query, setQuery] = useShareableState('q').string(''); // ❌ Conditional hook
    return <SearchResults query={query} />;
  }

  return <div>No search</div>;
}
```

### TypeScript Inference Issues

**Solution**: Use explicit type parameters or `as const`:

```tsx
// ✅ Explicit type
type Theme = 'light' | 'dark' | 'auto';
const [theme, setTheme] = useShareableState('theme').enum<Theme>(
  ['light', 'dark', 'auto'],
  'light',
);

// ✅ as const
const themes = ['light', 'dark', 'auto'] as const;
const [theme, setTheme] = useShareableState('theme').enum(themes, 'light');
```

---

## Builder Methods Reference

## Parameters

### key

`string`

## Returns

### boolean()

> `readonly` **boolean**(`defaultValue`, `opts?`): \[`null` \| `boolean`, `Updater`\<`null` \| `boolean`\>\]

Binds a boolean state to a query param, using '1' and '0' representations.
Accepts common truthy/falsy string variants when parsing.

#### Parameters

##### defaultValue

Initial boolean when the param is missing

`null` | `boolean`

##### opts?

Optional history action

###### action?

`HistoryAction`

History action to use when updating the URL (push or replace)

#### Returns

\[`null` \| `boolean`, `Updater`\<`null` \| `boolean`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [open, setOpen] = useShareableState('open').boolean(false);
```

### custom()

> `readonly` **custom**\<`T`\>(`defaultValue`, `parse`, `format`, `opts?`): \[`null` \| `T`, `Updater`\<`null` \| `T`\>\]

Fully custom binding. Provide your own parse/format functions.
Return null from parse to indicate an invalid/unsupported value and fall back to default.

#### Type Parameters

##### T

`T`

#### Parameters

##### defaultValue

Fallback when the URL value cannot be parsed

`null` | `T`

##### parse

(`raw`) => `null` \| `T`

Function parsing the raw string into T (return `null` on failure)

##### format

(`value`) => `string`

Function formatting T into a string (return empty string to delete param)

##### opts?

Optional history action

###### action?

`HistoryAction`

History action to use when updating the URL (push or replace)

#### Returns

\[`null` \| `T`, `Updater`\<`null` \| `T`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [ids, setIds] = useShareableState('ids').custom<number[]>(
  [],
  (raw) => raw.split(',').map(Number).filter(Number.isFinite),
  (v) => v.join(','),
);
```

### date()

> `readonly` **date**(`defaultValue`, `opts?`): \[`null` \| `Date`, `Updater`\<`null` \| `Date`\>\]

Binds a Date state to a query param, persisted as 'yyyy-MM-dd'.

#### Parameters

##### defaultValue

Initial date when the param is missing/invalid

`null` | `Date`

##### opts?

Optional min/max clamping and history action

###### action?

`HistoryAction`

History action to use when updating the URL (push or replace)

###### max?

`Date`

Maximum allowed date (dates after are clamped)

###### min?

`Date`

Minimum allowed date (dates before are clamped)

#### Returns

\[`null` \| `Date`, `Updater`\<`null` \| `Date`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [start, setStart] = useShareableState('start').date(new Date());
```

### enum()

> `readonly` **enum**\<`U`\>(`allowed`, `defaultValue`, `opts?`): \[`null` \| `U`, `Updater`\<`null` \| `U`\>\]

Binds a string literal union (enum-like) to a query param.
If the URL value is not within the allowed list, the default is used.

#### Type Parameters

##### U

`U` _extends_ `string`

extends string

#### Parameters

##### allowed

readonly `U`[]

Array of allowed string values

##### defaultValue

Fallback used when the URL value is not allowed

`null` | `U`

##### opts?

Optional history action

###### action?

`HistoryAction`

History action to use when updating the URL (push or replace)

#### Returns

\[`null` \| `U`, `Updater`\<`null` \| `U`\>\]

A tuple `[value, setValue]`

#### Example

```ts
type Theme = 'light' | 'dark';
const [theme, setTheme] = useShareableState('t').enum<Theme>(['light', 'dark'], 'light');
```

### json()

> `readonly` **json**\<`T`\>(`defaultValue`, `opts?`): \[`null` \| `T`, `Updater`\<`null` \| `T`\>\]

Binds a JSON-serializable value (object/array) to a query param.
You can optionally provide a validator to ensure shape and an omitEmpty function
to clear the param when the value is considered empty.

#### Type Parameters

##### T

`T`

#### Parameters

##### defaultValue

Initial value when the param is missing

`null` | `T`

##### opts?

Optional configuration

###### action?

`HistoryAction`

History action to use when updating the URL (push or replace)

###### omitEmpty?

(`value`) => `boolean`

When returns true, the param is deleted from the URL

###### parse?

(`raw`) => `unknown`

Custom JSON parser

###### stringify?

(`value`) => `string`

Custom JSON serializer

###### validate?

(`value`) => `value is T`

Type guard to validate parsed JSON (return false to fall back)

#### Returns

\[`null` \| `T`, `Updater`\<`null` \| `T`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [filters, setFilters] = useShareableState('f').json<{ q: string }>({ q: '' });
```

### number()

> `readonly` **number**(`defaultValue`, `opts?`): \[`null` \| `number`, `Updater`\<`null` \| `number`\>\]

Binds a number state to a query param. Invalid/NaN values fall back to default.

The number is stored as a base-10 string in the URL. You can optionally
constrain and normalize the value using `min`, `max` and `step`.

#### Parameters

##### defaultValue

Initial value when the param is missing/invalid

`null` | `number`

##### opts?

Optional constraints

###### action?

`HistoryAction`

History action to use when updating the URL (push or replace)

###### max?

`number`

Maximum allowed value (values above are clamped)

###### min?

`number`

Minimum allowed value (values below are clamped)

###### step?

`number`

Rounds to the nearest multiple of this step (must be > 0)

#### Returns

\[`null` \| `number`, `Updater`\<`null` \| `number`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [n, setN] = useShareableState('n').number(0, { min: 0, step: 1 });
```

### string()

> `readonly` **string**(`defaultValue`, `opts?`): \[`null` \| `string`, `Updater`\<`null` \| `string`\>\]

Binds a string state to a query param. No transformation is applied.

Use `minLength`/`maxLength` to coerce/pad or slice the string. An empty string
removes the query param from the URL.

#### Parameters

##### defaultValue

Initial value when the param is missing

`null` | `string`

##### opts?

Optional length constraints and history action

###### action?

`HistoryAction`

History action to use when updating the URL (push or replace)

###### maxLength?

`number`

Maximum allowed length (strings longer are truncated)

###### minLength?

`number`

Minimum allowed length (strings shorter are padded)

#### Returns

\[`null` \| `string`, `Updater`\<`null` \| `string`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [q, setQ] = useShareableState('q').string('');
```
