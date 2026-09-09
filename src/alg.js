export class Asig {
    data;
    buffer;
    version;
    startSecond;
    currentSecond;
    constructor() {
        // cf LatestStableVersion
        this.version = 1;
        const now = new Date();
        this.startSecond = Math.round(now.getTime() / 1000);
        this.currentSecond = this.startSecond;
        this.buffer = new ArrayBuffer(1, { maxByteLength: 4096 });
        this.data = new Uint8Array(this.buffer);
    }
    writeEvent(event) {
        const now = new Date();
        const nowSeconds = now.getTime() / 1000;
        const nowIndex = nowSeconds >> 2;
        const currentIndex = this.currentSecond >> 2;
        const pauseLength = nowIndex - currentIndex;
        if (pauseLength > 0) {
            this.buffer.resize(this.data.length + 1); // add 0
            if (pauseLength > 1) {
                this.buffer.resize(this.data.length + 2);
                this.data[this.data.length - 2] = Math.min(pauseLength, 255); // add pause length
                // add 0 
            }
            this.currentSecond = nowSeconds;
        }
        let b = this.data[this.data.length - 1];
        if (event.mouse) {
            if (b != 127 && b != 126 && b != 255 && b != 254) {
                b += 2;
            }
        }
        else {
            if ((event.specialPressed || event.controlPressed) && event.keyCode == "KeyV") {
                b |= 128;
            }
            else if (b != 127 && b != 255) {
                b += 1;
            }
        }
        this.data[this.data.length - 1] = b;
    }
    toString() {
        let s = this.version.toString();
        s += ".";
        s += bytesToBase64(int64ToBytes(this.startSecond));
        s += "..";
        s += bytesToBase64(this.data);
        s = s.replaceAll("=", "");
        return s;
    }
}
function bytesToBase64(bytes) {
    var binary = '';
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
function int64ToBytes(num) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigInt64(0, BigInt(num), true);
    return new Uint8Array(buffer);
}
export class AsigEvent {
    mouse = false;
    keyCode = "";
    text = "";
    controlPressed = false;
    specialPressed = false;
    shiftPressed = false;
}
