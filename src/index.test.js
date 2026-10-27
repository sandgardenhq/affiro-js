import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { inspect } from "node:util";
import { Monitor, AffiroError, DefaultHost } from "../dist/affiro.esm.js";

const KEY = "crd-0000000000001111.s3cret";

function fakeWindow() {
    const listeners = {};
    return {
        addEventListener(type, fn) {
            (listeners[type] ??= []).push(fn);
        },
        type(code) {
            for (const fn of listeners.keydown ?? []) {
                fn({ isTrusted: true, code, key: code, shiftKey: false, ctrlKey: false, metaKey: false });
            }
        },
    };
}

function stubFetch(respond) {
    const calls = [];
    globalThis.fetch = async (url, init) => {
        const call = { url, init };
        calls.push(call);
        return respond(call);
    };
    return calls;
}

function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

const collected = {
    id: "sdc-5cba9a5c8d3bdb41",
    documentId: "doc-c471495b214cd641",
    externalId: "applicant-1234",
};

function monitor(options = { publishableKey: KEY, host: "https://api.test" }) {
    globalThis.window = fakeWindow();
    const m = new Monitor(options);
    window.type("KeyA");
    return m;
}

test("submit posts the signed document with the key as a bearer token", async () => {
    const calls = stubFetch(() => jsonResponse(200, collected));
    const m = monitor();

    const doc = await m.submit("my answer", { externalId: "applicant-1234" });

    assert.deepEqual(doc, collected);
    assert.equal(calls.length, 1);
    const { url, init } = calls[0];
    assert.equal(url, "https://api.test/api/v1/documents?externalId=applicant-1234");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["Authorization"], "Bearer " + KEY);
    assert.equal(init.headers["Content-Type"], "text/plain; charset=utf-8");
    assert.equal(init.credentials, "omit");
    assert.equal(init.body, m.toString() + "\nmy answer");
});

test("submit resolves to the three documented fields and never a verdict", async () => {
    stubFetch(() => jsonResponse(200, {
        ...collected,
        humanWritten: "likely",
        descriptions: ["typing pattern appears natural"],
    }));
    const doc = await monitor().submit("my answer");
    assert.deepEqual(Object.keys(doc).sort(), ["documentId", "externalId", "id"]);
});

test("host defaults to the Go client's and tolerates a trailing slash", async () => {
    const calls = stubFetch(() => jsonResponse(200, collected));
    await monitor({ publishableKey: KEY }).submit("a");
    await monitor({ publishableKey: KEY, host: "http://127.0.0.1:10380/" }).submit("a");
    assert.equal(DefaultHost, "https://app.affiro.com");
    assert.equal(calls[0].url, "https://app.affiro.com/api/v1/documents");
    assert.equal(calls[1].url, "http://127.0.0.1:10380/api/v1/documents");
});

test("each failure is told apart by kind and status", async (t) => {
    const cases = [
        { name: "KeyRejected", status: 401, error: "access denied", kind: "unauthorized" },
        { name: "KeyForbidden", status: 403, error: "forbidden", kind: "unauthorized" },
        { name: "ExternalIDReused", status: 409, error: "conflict: that externalId is already used", kind: "invalid_document" },
        { name: "ServerFailed", status: 500, error: "", kind: "unavailable" },
        { name: "ProxyAnsweredWithHTML", status: 502, body: "<html>Bad Gateway</html>", kind: "unavailable" },
    ];
    for (const tc of cases) {
        await t.test(tc.name, async () => {
            stubFetch(() => tc.body !== undefined
                ? new Response(tc.body, { status: tc.status })
                : jsonResponse(tc.status, { error: tc.error }));
            await assert.rejects(monitor().submit("a"), (err) => {
                assert.ok(err instanceof AffiroError);
                assert.equal(err.kind, tc.kind);
                assert.equal(err.status, tc.status);
                if (tc.error) {
                    assert.ok(err.message.includes(tc.error), err.message);
                }
                return true;
            });
        });
    }
});

test("an unreachable API is unavailable with no status", async () => {
    stubFetch(() => { throw new TypeError("Failed to fetch"); });
    await assert.rejects(monitor().submit("a"), (err) => {
        assert.equal(err.kind, "unavailable");
        assert.equal(err.status, 0);
        assert.ok(err.cause instanceof TypeError);
        return true;
    });
});

test("an answer that is not a document is unavailable", async (t) => {
    const answers = {
        NotJSON: () => new Response("not json", { status: 200 }),
        Null: () => jsonResponse(200, null),
        MissingIDs: () => jsonResponse(200, { externalId: "applicant-1234" }),
    };
    for (const [name, respond] of Object.entries(answers)) {
        await t.test(name, async () => {
            stubFetch(respond);
            await assert.rejects(monitor().submit("a"), { kind: "unavailable", status: 200 });
        });
    }
});

test("the key stays out of a rejection even when the answer echoes it", async () => {
    const m = monitor();
    const leaks = [
        () => jsonResponse(401, { error: "bad token " + KEY }),
        () => { throw new TypeError("could not send " + KEY); },
    ];
    for (const respond of leaks) {
        stubFetch(respond);
        await assert.rejects(m.submit("a"), (err) => {
            assert.ok(!err.message.includes(KEY), err.message);
            assert.ok(!err.stack.includes(KEY), err.stack);
            assert.ok(!inspect(err).includes(KEY), "an error reporter printing the cause chain sees the key");
            return true;
        });
    }
    assert.ok(!JSON.stringify(m).includes(KEY));
    assert.ok(!Object.values(m).some((v) => String(v).includes(KEY)));
});

test("a monitor with no key captures as before and submits nothing", async () => {
    const calls = stubFetch(() => jsonResponse(200, collected));
    globalThis.window = fakeWindow();
    const m = new Monitor();
    window.type("KeyA");
    assert.ok(m.toString().startsWith("1."));
    await assert.rejects(m.submit("a"), { kind: "unauthorized", status: 0 });
    await assert.rejects(monitor({ publishableKey: "" }).submit("a"), { kind: "unauthorized", status: 0 });
    assert.equal(calls.length, 0);
    const before = m.toString();
    m.reset();
    assert.notEqual(m.toString(), before);
});

test("submitting leaves capture alone, whichever way it settles", async () => {
    const answers = [jsonResponse(200, collected), jsonResponse(500, { error: "boom" })];
    const calls = stubFetch(() => answers.shift());
    const m = monitor();
    const before = m.toString();

    await m.submit("first");
    assert.equal(m.toString(), before);
    await assert.rejects(m.submit("second"));
    assert.equal(m.toString(), before);

    assert.equal(calls.length, 2, "a second submit without reset() is a second request");
    assert.equal(calls[0].init.body, before + "\nfirst");
    assert.equal(calls[1].init.body, before + "\nsecond");

    m.reset();
    assert.notEqual(m.toString(), before);
});

test("keys typed while a submit is in flight are not in what it sent", async () => {
    let release;
    const calls = stubFetch(() => new Promise((r) => { release = () => r(jsonResponse(200, collected)); }));
    const m = monitor();
    const signed = m.toString();
    const pending = m.submit("a");
    window.type("KeyB");
    release();
    await pending;
    assert.equal(calls[0].init.body, signed + "\na");
    assert.notEqual(m.toString(), signed, "capture kept going during the request");
});

test("the plain-script build exposes Affiro.Monitor, and it submits", async () => {
    const src = readFileSync(new URL("../dist/affiro.min.js", import.meta.url), "utf8");
    const calls = [];
    const win = fakeWindow();
    const sandbox = {
        window: win,
        URLSearchParams,
        btoa,
        fetch: async (url, init) => {
            calls.push({ url, init });
            return jsonResponse(200, collected);
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(src + "\nthis.Affiro = Affiro;", sandbox);

    assert.equal(typeof sandbox.Affiro.Monitor, "function");
    const m = new sandbox.Affiro.Monitor({ publishableKey: KEY, host: "https://api.test" });
    win.type("KeyA");
    const doc = await m.submit("hello");
    assert.deepEqual({ ...doc }, collected);
    assert.equal(calls[0].init.headers["Authorization"], "Bearer " + KEY);
    assert.ok(new sandbox.Affiro.Monitor().toString().startsWith("1."));
});

test("two submits in flight at once each send their own request", async () => {
    const pending = [];
    const calls = stubFetch(() => new Promise((r) => pending.push(r)));
    const m = monitor();
    const signed = m.toString();
    const first = m.submit("a");
    const second = m.submit("b");
    await new Promise((r) => setImmediate(r));
    pending[1](jsonResponse(500, { error: "boom" }));
    pending[0](jsonResponse(200, collected));
    await assert.rejects(second, { kind: "unavailable" });
    assert.deepEqual(await first, collected);
    assert.deepEqual(calls.map((c) => c.init.body), [signed + "\na", signed + "\nb"]);
});
