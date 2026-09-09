# @sandgardenhq/affiro

Embed Affiro's keystroke-signature verification on any web page, no browser extension required.

### Usage

```js
import { Monitor } from "@sandgardenhq/affiro";

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

## Building

```
npm install
npm install typescript
npm run build     # -> dist/affiro.esm.js, dist/affiro.min.js, dist/affiro.extension.js, dist/keymonitor.wasm
npm test 
```
