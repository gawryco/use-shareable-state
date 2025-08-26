<div align="center">
  <img src="../media/useShareableState.png" alt="useShareableState" width="600" />
  
  # use-shareable-state
  
  **The tiny, typed React hook for URL query string state**
  
  Transform your components into shareable, bookmarkable experiences with zero boilerplate.
  
  [![npm version](https://img.shields.io/npm/v/@gawryco/use-shareable-state.svg)](https://www.npmjs.com/package/@gawryco/use-shareable-state)
  [![Bundle size](https://img.shields.io/bundlephobia/minzip/@gawryco/use-shareable-state.svg)](https://bundlephobia.com/package/@gawryco/use-shareable-state)
  [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
  [![CI](https://github.com/gawryco/use-shareable-state/actions/workflows/ci.yml/badge.svg)](https://github.com/gawryco/use-shareable-state/actions/workflows/ci.yml)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  
  [**Examples →**](#-examples) | [**API Docs →**](https://gawryco.github.io/use-shareable-state/api)
</div>

---

## ✨ Why useShareableState?

Turn this 😰:

```tsx
// Manual URL state management
const [filters, setFilters] = useState({ search: '', category: 'all' });
const [page, setPage] = useState(1);

// Manually sync with URL on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setFilters({
    search: params.get('search') || '',
    category: params.get('category') || 'all',
  });
  setPage(Number(params.get('page')) || 1);
}, []);

// Manually update URL on changes
useEffect(() => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category !== 'all') params.set('category', filters.category);
  if (page > 1) params.set('page', String(page));
  window.history.replaceState({}, '', `?${params}`);
}, [filters, page]);
```

Into this 🚀:

```tsx
// Automatic URL state management
const [search, setSearch] = useShareableState('search').string('');
const [category, setCategory] = useShareableState('category').string('all');
const [page, setPage] = useShareableState('page').number(1);
```

## 🎯 Features

<table>
<tr>
<td>

### 🏗️ **Type-Safe Builders**

Built-in support for `number`, `string`, `boolean`, `date`, `enum`, `json`, and `custom` types with full TypeScript inference.

</td>
<td>

### ⚡ **Zero Boilerplate**

One-liner setup per query parameter. React-style setters with automatic URL synchronization.

</td>
</tr>
<tr>
<td>

### 🔄 **Navigation Support**

Automatically handles browser back/forward navigation, keeping state and URL in perfect sync.

</td>
<td>

### 🌐 **SSR Ready**

Safe guards for server-side rendering. Should work with Next.js, Remix, and other React frameworks.

</td>
</tr>
<tr>
<td>

### 📦 **Tiny Bundle**

< 2kB gzipped. Tree-shakeable ESM and CJS builds with zero dependencies.

</td>
<td>

### 🔧 **Framework Agnostic**

Pure URL manipulation. Works with any React app, any router, any bundler.

</td>
</tr>
</table>

## 📦 Installation

```bash
# npm
npm install @gawryco/use-shareable-state

# pnpm
pnpm add @gawryco/use-shareable-state

# yarn
yarn add @gawryco/use-shareable-state
```

**Requirements:** React ≥ 17.0.0

## 🚀 Quick Start

```tsx
import { useShareableState } from '@gawryco/use-shareable-state';

function SearchPage() {
  // Typed string state synced with ?q=...
  const [query, setQuery] = useShareableState('q').string('');

  // Typed number state synced with ?page=...
  const [page, setPage] = useShareableState('page').number(1);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />

      <button onClick={() => setPage((p) => p + 1)}>Page {page}</button>

      {/* URL automatically updates: ?q=react&page=2 */}
    </div>
  );
}
```

**That's it!** 🎉 The URL updates automatically, browser navigation works, and state persists across page refreshes.

## 🎨 Examples

### 🔍 Search & Filters

```tsx
function ProductSearch() {
  const [search, setSearch] = useShareableState('q').string('');
  const [category, setCategory] = useShareableState('cat').enum(
    ['electronics', 'clothing', 'books'] as const,
    'electronics',
  );
  const [minPrice, setMinPrice] = useShareableState('min').number(0, { min: 0 });
  const [inStock, setInStock] = useShareableState('stock').boolean(false);

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products..."
      />

      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="books">Books</option>
      </select>

      <input
        type="number"
        value={minPrice}
        onChange={(e) => setMinPrice(Number(e.target.value))}
        placeholder="Min price"
      />

      <label>
        <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
        In stock only
      </label>

      {/* URL: ?q=laptop&cat=electronics&min=500&stock=1 */}
    </div>
  );
}
```

### 🔘 Optional Params (Null Defaults)

```tsx
function OptionalParams() {
  // Params are omitted from the URL until they are explicitly set
  const [search, setSearch] = useShareableState('q').string(null);
  const [category, setCategory] = useShareableState('cat').enum(
    ['electronics', 'clothing', 'books'] as const,
    null,
  );
  const [minPrice, setMinPrice] = useShareableState('min').number(null, { min: 0 });

  // URL examples:
  // - Initially:    (no params)
  // - After search: ?q=laptop
  // - After picks:  ?q=laptop&cat=electronics&min=500

  return (
    <div>
      <input value={search ?? ''} onChange={(e) => setSearch(e.target.value)} />
      <select value={category ?? ''} onChange={(e) => setCategory(e.target.value as any)}>
        <option value="">All</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="books">Books</option>
      </select>
      <input
        type="number"
        value={minPrice ?? ''}
        onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : null)}
      />
    </div>
  );
}
```

### 🧭 Push History Entries

```tsx
function SearchWithHistory() {
  // Use action: 'push' to add a new history entry on each update
  const [q, setQ] = useShareableState('q').string('', { action: 'push' });
  const [page, setPage] = useShareableState('page').number(1, { action: 'push' });

  // Hitting the browser Back button will step through previous q/page states

  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
      <button onClick={() => setPage((p) => (p ?? 1) + 1)}>Next page</button>
    </div>
  );
}
```

### 📅 Date Ranges

```tsx
function EventCalendar() {
  const [startDate, setStartDate] = useShareableState('from').date(new Date('2024-01-01'), {
    min: new Date('2024-01-01'),
    max: new Date('2024-12-31'),
  });

  const [endDate, setEndDate] = useShareableState('to').date(new Date('2024-12-31'));

  return (
    <div>
      <input
        type="date"
        value={startDate.toISOString().slice(0, 10)}
        onChange={(e) => setStartDate(new Date(e.target.value))}
      />
      <input
        type="date"
        value={endDate.toISOString().slice(0, 10)}
        onChange={(e) => setEndDate(new Date(e.target.value))}
      />

      {/* URL: ?from=2024-06-01&to=2024-06-30 */}
    </div>
  );
}
```

### 🗂️ Complex Objects with JSON

```tsx
interface TableConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  columns: string[];
}

function DataTable() {
  const [config, setConfig] = useShareableState('config').json<TableConfig>(
    {
      sortBy: 'name',
      sortOrder: 'asc',
      columns: ['name', 'email', 'role'],
    },
    {
      // Only add to URL when config differs from default
      omitEmpty: (cfg) =>
        cfg.sortBy === 'name' && cfg.sortOrder === 'asc' && cfg.columns.length === 3,
    },
  );

  const updateSort = (field: string) => {
    setConfig((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <table>
      <thead>
        <tr>
          {config.columns.map((col) => (
            <th key={col} onClick={() => updateSort(col)}>
              {col} {config.sortBy === col && (config.sortOrder === 'asc' ? '↑' : '↓')}
            </th>
          ))}
        </tr>
      </thead>
      {/* ... table body */}
    </table>
  );
}
```

### 🎛️ Custom Serialization

```tsx
// For comma-separated arrays
function TagFilter() {
  const [tags, setTags] = useShareableState('tags').custom<string[]>(
    [],
    // Parse: "react,typescript,hooks" → ["react", "typescript", "hooks"]
    (str) => (str ? str.split(',').filter(Boolean) : []),
    // Format: ["react", "hooks"] → "react,hooks"
    (arr) => (arr.length > 0 ? arr.join(',') : ''),
  );

  const addTag = (tag: string) => setTags((prev) => [...prev, tag]);
  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  return (
    <div>
      {tags.map((tag) => (
        <span key={tag} onClick={() => removeTag(tag)}>
          {tag} ×
        </span>
      ))}
      {/* URL: ?tags=react,typescript,hooks */}
    </div>
  );
}
```

## 📚 API Reference

### 🏗️ Type Builders

#### `number(defaultValue, options?)`

```tsx
const [count, setCount] = useShareableState('count').number(0, {
  min: 0, // Clamp to minimum value
  max: 100, // Clamp to maximum value
  step: 5, // Round to nearest step
});
```

#### `string(defaultValue, options?)`

```tsx
const [name, setName] = useShareableState('name').string('', {
  maxLength: 50, // Truncate if too long
  minLength: 2, // Pad with spaces if too short
});
```

#### `boolean(defaultValue)`

```tsx
const [enabled, setEnabled] = useShareableState('enabled').boolean(false);
// Accepts: '1', 'true', 't', 'yes', 'y' (truthy)
//         '0', 'false', 'f', 'no', 'n' (falsy)
```

#### `date(defaultValue, options?)`

```tsx
const [birthday, setBirthday] = useShareableState('birthday').date(new Date('1990-01-01'), {
  min: new Date('1900-01-01'),
  max: new Date(),
});
// Format: YYYY-MM-DD (UTC)
```

#### `enum<T>(allowedValues, defaultValue)`

```tsx
type Theme = 'light' | 'dark' | 'auto';
const [theme, setTheme] = useShareableState('theme').enum<Theme>(
  ['light', 'dark', 'auto'],
  'light',
);
```

#### `json<T>(defaultValue, options?)`

```tsx
const [settings, setSettings] = useShareableState('settings').json(
  { theme: 'light', lang: 'en' },
  {
    validate: (obj): obj is Settings => typeof obj === 'object' && 'theme' in obj,
    omitEmpty: (obj) => Object.keys(obj).length === 0,
    stringify: (obj) => JSON.stringify(obj, null, 0),
    parse: (str) => JSON.parse(str),
  },
);
```

#### `custom<T>(defaultValue, parse, format)`

```tsx
const [coords, setCoords] = useShareableState('pos').custom<[number, number]>(
  [0, 0],
  (str) => {
    const [x, y] = str.split(',').map(Number);
    return [x || 0, y || 0];
  },
  ([x, y]) => `${x},${y}`,
);
```

## 🌐 SSR & Frameworks

### Next.js

```tsx
// pages/search.tsx or app/search/page.tsx
export default function SearchPage() {
  // ✅ Safe during SSR - returns default until hydration
  const [query, setQuery] = useShareableState('q').string('');

  return <SearchComponent query={query} onSearch={setQuery} />;
}
```

### Remix

```tsx
// routes/search.tsx
export default function SearchRoute() {
  const [filters, setFilters] = useShareableState('filters').json({});

  return <FilteredList filters={filters} onChange={setFilters} />;
}
```

## 🔧 Advanced Usage

### Multiple Parameters

```tsx
function useProductFilters() {
  return {
    search: useShareableState('q').string(''),
    category: useShareableState('cat').enum(['all', 'new', 'sale'], 'all'),
    priceRange: useShareableState('price').custom<[number, number]>(
      [0, 1000],
      (str) => str.split('-').map(Number) as [number, number],
      ([min, max]) => `${min}-${max}`,
    ),
    page: useShareableState('page').number(1, { min: 1 }),
  };
}

function ProductList() {
  const filters = useProductFilters();

  // All URL parameters are automatically synchronized
  // URL: ?q=laptop&cat=sale&price=100-500&page=2
}
```

### Event Monitoring

```tsx
useEffect(() => {
  const handleQueryChange = (event: CustomEvent) => {
    console.log('Query state changed:', event.detail);
    // { key: 'search', prev: '', next: 'react', source: 'set', ts: 1234567890 }
  };

  window.addEventListener('qs:changed', handleQueryChange);
  return () => window.removeEventListener('qs:changed', handleQueryChange);
}, []);
```

### Reset to Defaults

```tsx
function SearchFilters() {
  const [search, setSearch] = useShareableState('q').string('');
  const [category, setCategory] = useShareableState('cat').string('all');

  const clearFilters = () => {
    setSearch(''); // Removes ?q= from URL
    setCategory('all'); // Removes ?cat= from URL
  };

  return <button onClick={clearFilters}>Clear Filters</button>;
}
```

## 🚀 Migration Guide

### From Manual URL Management

```tsx
// Before: Manual URL state
const [search, setSearch] = useState('');

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setSearch(params.get('q') || '');
}, []);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (search) {
    params.set('q', search);
  } else {
    params.delete('q');
  }
  window.history.replaceState({}, '', `?${params}`);
}, [search]);

// After: useShareableState
const [search, setSearch] = useShareableState('q').string('');
```

### From React Router useSearchParams

```tsx
// Before: React Router
import { useSearchParams } from 'react-router-dom';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const setQuery = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('q', value);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };
}

// After: useShareableState
function SearchPage() {
  const [query, setQuery] = useShareableState('q').string('');
}
```

### From Next.js useRouter

```tsx
// Before: Next.js useRouter
import { useRouter } from 'next/router';

function SearchPage() {
  const router = useRouter();
  const { q = '' } = router.query;

  const setQuery = (value: string) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, q: value || undefined },
      },
      undefined,
      { shallow: true },
    );
  };
}

// After: useShareableState
function SearchPage() {
  const [query, setQuery] = useShareableState('q').string('');
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

### Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build package
pnpm build

# Generate docs
pnpm docs:build
```

## 🏆 Used By

<div align="center">
  <em>Join the companies using useShareableState in production:</em>
  <br><br>
  <a href="https://github.com/gawryco/use-shareable-state/issues/new?title=Add%20my%20company">
    <strong>+ Add your company</strong>
  </a>
</div>

## 📄 License

MIT © [Gawry & Co](https://github.com/gawryco)

---

<div align="center">
  <strong>⭐ Star us on GitHub — it motivates us a lot!</strong>
  <br><br>
  
  [**Documentation**](api) · [**Examples**](https://stackblitz.com/edit/use-shareable-state-demo) · [**Issues**](https://github.com/gawryco/use-shareable-state/issues) · [**Discussions**](https://github.com/gawryco/use-shareable-state/discussions)
</div>
