---
"@chuvenger/typescript-app-stack": patch
---

**Add `cn` for composing and merging Tailwind classes.**

Conditional classes were otherwise a hand-rolled
`[a, cond && b].filter(Boolean).join(" ")` in every component taking a
`className`/`class` prop, and that form cannot express an override: a prop
meant to replace a default has to win over it, and plain concatenation leaves
the winner up to whichever utility Tailwind emitted later in the stylesheet,
not the call order.

[`cn`](https://github.com/shadcn-ui/cn) does both halves in one zero-dependency
package — conditional joining like `clsx`, conflict resolution like
`tailwind-merge`:

```ts
import { cn } from "cn"

cn("px-2 py-1", isActive && "bg-blue-500", { "text-white": isActive })
cn("bg-blue-500 p-4", className)  // className wins on any utility it sets
```

Verified against the installed 0.4.0, not just the README: `cn("p-4", "p-2")`
is `"p-2"`; `cn("px-4", { "opacity-50": true, hidden: false })` is
`"px-4 opacity-50"`; `cn("bg-blue-500 p-4", "bg-red-500")` is
`"p-4 bg-red-500"`.

It lives in `typescript-app-stack` next to `tailwindcss` and
`tailwindcss-animate`, so both framework stacks get it.

### Why this and not `clsx` + `tailwind-merge`

The two-package pair is the same thing at 212 KB installed across two trees
plus a wrapper in every app's `lib/utils`. `cn` is one dependency with none of
its own, re-exports `clsx`, `twMerge` and `twJoin` under those exact names for
drop-in parity, and mirrors `extendTailwindMerge` as `createCn` from
`cn/config` for custom themes. Its own benchmark reports ~37× faster than the
pair over 144,265 calls harvested from 58 open-source repos; that is not the
reason to switch, it just is not slower.

The trade-off, stated because a stack dependency is inherited by every
consuming app: `cn` is young. First release 2026-09-01, `0.4.0` on 2026-09-22.
Against that it carries ~8.9M weekly downloads, asserts output parity with
tailwind-merge across 356,000 differential tests, and — because every export
name matches — reverting to `clsx` + `tailwind-merge` is a dependency swap and
an import change, nothing more.

Two things it is not: Tailwind v4 only, so it is not an option for an app still
on v3 (use `tailwind-merge@^2` there); and the optional build-time compiler
(`cn/vite`, `cn/next`) is **not** wired into `createViteConfig`, since it
cannot see dynamically constructed class names like `"p-" + size` without a
safelist. Importing `cn` needs no configuration.
