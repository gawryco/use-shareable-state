[**use-shareable-state**](../README.md)

---

[use-shareable-state](../README.md) / useShareableState

# Function: useShareableState()

> **useShareableState**(`key`): `object`

Defined in: [useShareableState.ts:256](https://github.com/gawryco/use-shareable-state/blob/52e49c12bc580aad84f842ab01edcb7dd1829529/src/useShareableState.ts#L256)

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

> `readonly` **boolean**(`defaultValue`): \[`boolean`, `Updater`\<`boolean`\>\]

Binds a boolean state to a query param, using '1' and '0' representations.
Accepts common truthy/falsy string variants when parsing.

#### Parameters

##### defaultValue

`boolean`

Initial boolean when the param is missing

#### Returns

\[`boolean`, `Updater`\<`boolean`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [open, setOpen] = useShareableState('open').boolean(false);
```

### custom()

> `readonly` **custom**\<`T`\>(`defaultValue`, `parse`, `format`): \[`T`, `Updater`\<`T`\>\]

Fully custom binding. Provide your own parse/format functions.
Return null from parse to indicate an invalid/unsupported value and fall back to default.

#### Type Parameters

##### T

`T`

#### Parameters

##### defaultValue

`T`

Fallback when the URL value cannot be parsed

##### parse

(`raw`) => `null` \| `T`

Function parsing the raw string into T (return `null` on failure)

##### format

(`value`) => `string`

Function formatting T into a string (return empty string to delete param)

#### Returns

\[`T`, `Updater`\<`T`\>\]

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

> `readonly` **date**(`defaultValue`, `opts?`): \[`Date`, `Updater`\<`Date`\>\]

Binds a Date state to a query param, persisted as 'yyyy-MM-dd'.

#### Parameters

##### defaultValue

`Date`

Initial date when the param is missing/invalid

##### opts?

Optional min/max clamping

###### max?

`Date`

###### min?

`Date`

#### Returns

\[`Date`, `Updater`\<`Date`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [start, setStart] = useShareableState('start').date(new Date());
```

### enum()

> `readonly` **enum**\<`U`\>(`allowed`, `defaultValue`): \[`U`, `Updater`\<`U`\>\]

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

`U`

Fallback used when the URL value is not allowed

#### Returns

\[`U`, `Updater`\<`U`\>\]

A tuple `[value, setValue]`

#### Example

```ts
type Theme = 'light' | 'dark';
const [theme, setTheme] = useShareableState('t').enum<Theme>(['light', 'dark'], 'light');
```

### json()

> `readonly` **json**\<`T`\>(`defaultValue`, `opts?`): \[`T`, `Updater`\<`T`\>\]

Binds a JSON-serializable value (object/array) to a query param.
You can optionally provide a validator to ensure shape and an omitEmpty function
to clear the param when the value is considered empty.

#### Type Parameters

##### T

`T`

#### Parameters

##### defaultValue

`T`

Initial value when the param is missing

##### opts?

Optional configuration

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

\[`T`, `Updater`\<`T`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [filters, setFilters] = useShareableState('f').json<{ q: string }>({ q: '' });
```

### number()

> `readonly` **number**(`defaultValue`, `opts?`): \[`number`, `Updater`\<`number`\>\]

Binds a number state to a query param. Invalid/NaN values fall back to default.

The number is stored as a base-10 string in the URL. You can optionally
constrain and normalize the value using `min`, `max` and `step`.

#### Parameters

##### defaultValue

`number`

Initial value when the param is missing/invalid

##### opts?

Optional constraints

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

\[`number`, `Updater`\<`number`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [n, setN] = useShareableState('n').number(0, { min: 0, step: 1 });
```

### string()

> `readonly` **string**(`defaultValue`, `opts?`): \[`string`, `Updater`\<`string`\>\]

Binds a string state to a query param. No transformation is applied.

Use `minLength`/`maxLength` to coerce/pad or slice the string. An empty string
removes the query param from the URL.

#### Parameters

##### defaultValue

`string`

Initial value when the param is missing

##### opts?

Optional length constraints

###### maxLength?

`number`

###### minLength?

`number`

#### Returns

\[`string`, `Updater`\<`string`\>\]

A tuple `[value, setValue]`

#### Example

```ts
const [q, setQ] = useShareableState('q').string('');
```
