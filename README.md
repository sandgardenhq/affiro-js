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

### Submitting to your organization

Create a publishable key on your organization's page on Affiro. It's meant to be public, so put it
in your page's source; it can only add documents to your organization.

```js
const monitor = new Affiro.Monitor({ publishableKey: "crd-..." });

const doc = await monitor.submit(text, { externalId: "applicant-1234" });
// { id: "sdc-...", documentId: "doc-...", externalId: "applicant-1234" }
```

The answer has no verdict; read that on your organization's page. `externalId` is optional and must
be unique within your organization. A failed submit rejects with an `AffiroError` whose `kind` is
`unauthorized`, `invalid_document` or `unavailable` (the only one worth retrying).

## Building

```
npm install
npm run build     # -> dist/affiro.esm.js, dist/affiro.min.js
npm test          # tests the built dist/, so build first
```
