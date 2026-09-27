---
'@gawryco/use-shareable-state': patch
---

Fix builder typings. `.number().optional()`, `.boolean().optional()` and
`.custom<T>(default, parse, format)` now work as documented (they failed to typecheck and threw at
runtime). `.number.optional()` and `.boolean.optional()` keep working. Option objects accept
explicitly `undefined` properties, so consumers using `exactOptionalPropertyTypes` can forward
optional props.
