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

The script build puts everything under a global `Affiro`:

```html

<script src="affiro.min.js"></script>
<script>
    let monitor = new Affiro.Monitor();
    console.log(monitor.toString());
</script>
```

## Building

```
npm install
npm run build     # -> dist/affiro.esm.js, dist/affiro.min.js
npm test
```
