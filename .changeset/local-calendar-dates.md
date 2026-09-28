---
'@gawryco/use-shareable-state': minor
---

Fix `.date()` shifting the calendar day outside UTC.

Dates are now calendar days in local time on both sides: `?d=2026-11-30` is read as local
midnight of Nov 30, and a Date is written from its local year/month/day. Previously the URL was
written from UTC components and read back as midnight UTC, so a date picked in any timezone behind
UTC (the Americas) came back one day earlier, and timezones ahead of UTC wrote the previous
day into the URL. Days that don't exist (e.g. `2026-02-31`) now fall back to the default instead
of rolling over.

Behavior change: build dates with `new Date(y, monthIndex, d)`. `new Date('2024-01-01')` is
midnight UTC, which is Dec 31 in timezones behind UTC. Existing links now resolve to the day
written in them: behind UTC, `?d=2026-11-30` used to read as Nov 29 and now reads as Nov 30.
