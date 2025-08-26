[**@gawryco/use-shareable-state**](../README.md)

---

[@gawryco/use-shareable-state](../README.md) / useShareableState

# Function: useShareableState()

> **useShareableState**(`key`): `object`

Defined in: [useShareableState.ts:283](https://github.com/gawryco/use-shareable-state/blob/14fd79a5d1fa7c1cb8f39ed66c0f5b3a953cdb04/src/useShareableState.ts#L283)

Public API: returns builder methods for creating typed query‑state pairs.

Pattern:
const [value, setValue] = useShareableState('key').number(123);

Available builders:

- number(defaultValue): number
- string(defaultValue): string
- boolean(defaultValue): boolean (stored as '1' | '0')
- date(defaultValue): Date (stored as 'yyyy-MM-dd')
- enum(allowed, defaultValue): U extends string
- custom(defaultValue, parse, format): T

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
