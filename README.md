# @sandgarden/affiro

Embed Affiro's keystroke-signature verification on any web page, no browser extension required.

### Usage

```js
import { Monitor } from "@sandgarden/affiro";

const monitor = new Monitor();

monitor.toString(); // current signature
monitor.reset();  // start a fresh signature
```

### Plain HTML page 

```html

<script src="affiro.min.js"></script>
<script>
    let monitor = new Monitor();
    console.log(monitor.toString());
</script>
```

## How this relates to the Go implementation

This package is a TypeScript port of `asig`, the signature library in
[sandgardenhq/affiro](https://github.com/sandgardenhq/affiro). `asig` is the reference
implementation and this is the follower: `src/alg.ts` reimplements the same wire format, so that a
signature produced in a browser verifies identically to one produced by the `affiro` CLI.

That parity is the whole point of the package, and a single test guards it — `"asig string matches
Go"` in `src/alg.test.js`, which asserts a hardcoded expected encoding. **When the format changes in
the Go repo, this package has to change with it, and nothing will tell you**: the two repos build
and test independently, and this one's CI only runs its own suite. Re-read `asig/encoding_string.go`
and `asig/alg-v1.go` over there before touching `src/alg.ts`.

## Where signatures get verified

Producing a signature is half the flow; something has to check it. That is the Affiro playground at
[app.affiro.com](https://app.affiro.com) — source in the private `sandgardenhq/affiro-playground`
repo — which documents its API at [app.affiro.com/api](https://app.affiro.com/api).

The playground also consumes this package, but not from npm. It vendors a built copy of
`dist/affiro.min.js` into two places: its browser extension, and its own web frontend. A release
published here reaches neither until someone re-runs the vendor step in that repo, so publishing a
version is not the same as shipping it.

## Building

```
npm install
npm run build     # -> dist/affiro.esm.js, dist/affiro.min.js
npm test
```
