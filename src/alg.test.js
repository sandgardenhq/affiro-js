import test from "node:test";
import assert from "node:assert/strict";
import { Asig, AsigEvent, bytesToBase64, int64ToBytes } from "./alg.js";

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
    console.log(str)
});

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

test("startSecond is url-safe", async (t) => {
    for (let i = 0; i < 10000; i++) {
        const j = getRandomInt(1000000000)
        const ascii = bytesToBase64(int64ToBytes(j))
        console.log(ascii)
        assert.ok(!ascii.includes("+"))
        assert.ok(!ascii.includes("/"))
    }
});