[**@gawryco/use-shareable-state**](../README.md)

---

[@gawryco/use-shareable-state](../README.md) / useShareableState

# Function: useShareableState()

> **useShareableState**(`key`): `object`

Defined in: [useShareableState.ts:635](https://github.com/gawryco/use-shareable-state/blob/3ead32356882e4f3f0048f385321adf8be27df52/src/useShareableState.ts#L635)

Public API: returns builder methods for creating typed query‑state pairs.

Pattern:
const [value, setValue] = useShareableState('key').number(123); // non-nullable
const [value, setValue] = useShareableState('key').number().optional(); // nullable

Available builders:

- number(defaultValue): number (non-nullable) | number().optional(): number | null
- string(defaultValue): string (non-nullable) | string().optional(): string | null
- boolean(defaultValue): boolean (non-nullable) | boolean().optional(): boolean | null
- date(defaultValue): Date (non-nullable) | date().optional(): Date | null
- enum<U>(allowed, defaultValue): U (non-nullable) | enum<U>().optional(allowed): U | null
- custom<T>(defaultValue, parse, format): T (non-nullable) | custom<T>().optional(): T | null
- json<T>(defaultValue): T (non-nullable) | json<T>().optional(): T | null

## Parameters

### key

`string`

## Returns

### boolean

> `readonly` **boolean**: `BooleanBuilder` = `booleanBuilder`

Boolean state builder. Use .boolean(defaultValue) for non-nullable or .boolean().optional() for nullable.

#### Example

```ts
const [active, setActive] = useShareableState('active').boolean(false); // non-nullable
const [optional, setOptional] = useShareableState('opt').boolean().optional(); // nullable
```

### date

> `readonly` **date**: `DateBuilder` = `dateBuilder`

Date state builder. Use .date(defaultValue) for non-nullable or .date().optional() for nullable.

#### Example

```ts
const [start, setStart] = useShareableState('start').date(new Date()); // non-nullable
const [optional, setOptional] = useShareableState('opt').date().optional(); // nullable
```

### number

> `readonly` **number**: `NumberBuilder` = `numberBuilder`

Number state builder. Use .number(defaultValue) for non-nullable or .number().optional() for nullable.

#### Example

```ts
const [count, setCount] = useShareableState('count').number(0); // non-nullable
const [optional, setOptional] = useShareableState('opt').number().optional(); // nullable
```

### string

> `readonly` **string**: `StringBuilder` = `stringBuilder`

String state builder. Use .string(defaultValue) for non-nullable or .string().optional() for nullable.

#### Example

```ts
const [name, setName] = useShareableState('name').string(''); // non-nullable
const [optional, setOptional] = useShareableState('opt').string().optional(); // nullable
```

### custom()

> `readonly` **custom**\<`T`\>(): `CustomBuilder`\<`T`\>

Custom state builder. Provide your own parse/format functions.

#### Type Parameters

##### T

`T`

#### Returns

`CustomBuilder`\<`T`\>

#### Example

```ts
const [ids, setIds] = useShareableState('ids').custom<number[]>([], parse, format); // non-nullable
const [optional, setOptional] = useShareableState('opt')
  .custom<number[]>()
  .optional(null, parse, format); // nullable
```

### enum()

> `readonly` **enum**\<`U`\>(): `EnumBuilder`\<`U`\>

Enum state builder. Binds a string literal union (enum-like) to a query param.

#### Type Parameters

##### U

`U` _extends_ `string`

extends string

#### Returns

`EnumBuilder`\<`U`\>

#### Example

```ts
type Theme = 'light' | 'dark';
const [theme, setTheme] = useShareableState('theme').enum<Theme>(['light', 'dark'], 'light'); // non-nullable
const [optional, setOptional] = useShareableState('opt').enum<Theme>().optional(['light', 'dark']); // nullable
```

### json()

> `readonly` **json**\<`T`\>(): `JsonBuilder`\<`T`\>

JSON state builder. Binds a JSON-serializable value to a query param.

#### Type Parameters

##### T

`T`

#### Returns

`JsonBuilder`\<`T`\>

#### Example

```ts
const [data, setData] = useShareableState('data').json<{ q: string }>({ q: '' }); // non-nullable
const [optional, setOptional] = useShareableState('opt').json<{ q: string }>().optional(); // nullable
```
