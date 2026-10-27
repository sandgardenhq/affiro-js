import { Asig, AsigEvent } from "./alg";
export const DefaultHost = "https://app.affiro.com";
export class AffiroError extends Error {
    kind;
    status;
    constructor(kind, status, message, cause) {
        super(message, cause === undefined ? undefined : { cause });
        this.name = "AffiroError";
        this.kind = kind;
        this.status = status;
    }
}
export class Monitor {
    sig;
    #key;
    #host;
    constructor(options) {
        this.#key = options?.publishableKey ?? "";
        this.#host = (options?.host ?? DefaultHost).replace(/\/+$/, "");
        this.sig = new Asig();
        window.addEventListener("mouseup", ({ isTrusted }) => {
            //console.log("mouse event", isTrusted)
            if (isTrusted) {
                let ev = new AsigEvent();
                ev.mouse = true;
                this.sig.writeEvent(ev);
            }
        }, true);
        window.addEventListener("keydown", ({ isTrusted, code, key, shiftKey, ctrlKey, metaKey }) => {
            //console.log("keydown event", isTrusted)
            if (isTrusted) {
                let ev = new AsigEvent();
                ev.keyCode = code;
                ev.text = key;
                ev.shiftPressed = shiftKey;
                ev.controlPressed = ctrlKey;
                ev.specialPressed = metaKey;
                this.sig.writeEvent(ev);
            }
        }, true);
    }
    reset() {
        this.sig = new Asig();
    }
    toString() {
        return this.sig.toString();
    }
    async submit(text, options) {
        const body = this.toString() + "\n" + text;
        if (this.#key === "") {
            throw new AffiroError("unauthorized", 0, "affiro: this monitor was not given a publishable key");
        }
        let url = this.#host + "/api/v1/documents";
        if (options?.externalId) {
            url += "?" + new URLSearchParams({ externalId: options.externalId });
        }
        let resp;
        try {
            resp = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this.#key,
                    "Content-Type": "text/plain; charset=utf-8",
                },
                body,
                // The API answers with a wildcard origin, which browsers refuse alongside credentials.
                credentials: "omit",
            });
        }
        catch (err) {
            throw new AffiroError("unavailable", 0, "affiro: API unavailable: " + this.#scrub(String(err)), this.#scrubCause(err));
        }
        if (!resp.ok) {
            throw new AffiroError(kindForStatus(resp.status), resp.status, "affiro: " + this.#scrub(await errorMessage(resp)));
        }
        let doc;
        try {
            doc = await resp.json();
        }
        catch {
            doc = null;
        }
        if (typeof doc?.id !== "string" || doc.id === "" || typeof doc.documentId !== "string" || doc.documentId === "") {
            throw new AffiroError("unavailable", resp.status, "affiro: API answered with something other than a document");
        }
        // Anything else, such as a verdict, stays out of the page.
        return {
            id: doc.id,
            documentId: doc.documentId,
            externalId: typeof doc.externalId === "string" ? doc.externalId : "",
        };
    }
    #scrub(message) {
        return message.split(this.#key).join("[publishable key]");
    }
    // Error reporters print the cause too.
    #scrubCause(err) {
        const seen = String(err) + "\n" + String(err?.stack ?? "");
        if (!seen.includes(this.#key)) {
            return err;
        }
        return new Error(this.#scrub(String(err)));
    }
}
function kindForStatus(status) {
    switch (true) {
        case status === 401 || status === 403:
            return "unauthorized";
        case status >= 400 && status < 500:
            return "invalid_document";
        default:
            return "unavailable";
    }
}
async function errorMessage(resp) {
    try {
        const { error } = await resp.json();
        if (typeof error === "string" && error !== "") {
            return error;
        }
    }
    catch {
        // Not JSON; fall back to the status text.
    }
    return resp.statusText || "HTTP " + resp.status;
}
