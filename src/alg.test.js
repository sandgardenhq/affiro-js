import test from "node:test";
import assert from "node:assert/strict";
import { Asig, AsigEvent } from "./alg.js";

test("asig string matches Go", async (t) => {
    const sig = new Asig();
    let ev = new AsigEvent();
    ev.mouse = true; 
    sig.writeEvent(ev);
    ev = new AsigEvent();
    ev.keyCode = "KeyA"
    sig.writeEvent(ev);
    const str = sig.toString();
    assert.ok(str.startsWith("1."));
    // middle characters will be based on the current timestamp;
    // we could hardcode a current time. 
    assert.ok(str.endsWith("AAAA..Aw"));
    assert.strictEqual(str.length, 17);
});