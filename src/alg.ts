export class Asig {
    data: Uint8Array<ArrayBuffer>;
    buffer: ArrayBuffer;
    version: number;
    startSecond: number;
    currentSecond: number;

    constructor() {
        // cf LatestStableVersion
        this.version = 1;
        const now = new Date();
        this.startSecond = Math.round(now.getTime() / 1000);
        this.currentSecond = this.startSecond;
        this.buffer = new ArrayBuffer(1, { maxByteLength: 4096});
        this.data = new Uint8Array(this.buffer);
    }

    writeEvent(event : AsigEvent) {
        const now = new Date(); 
        const nowSeconds = now.getTime() / 1000;
        const nowIndex = nowSeconds >> 2;
        const currentIndex = this.currentSecond >> 2;
        const pauseLength = nowIndex - currentIndex;
        if (pauseLength > 0) {
            this.buffer.resize(this.data.length+1) // add 0
            if (pauseLength > 1) {
                this.buffer.resize(this.data.length+2)
                this.data[this.data.length-2] = Math.min(pauseLength, 255) // add pause length
                // add 0 
            }
            this.currentSecond = nowSeconds
        }
        let b = this.data[this.data.length-1]
        if (event.mouse) {
            if (b != 127 && b != 126 && b != 255 && b != 254) {
                b += 2
            }
        } else {
            if ((event.specialPressed || event.controlPressed) && event.keyCode == "KeyV") {
    			b |= 128
            } else if (b != 127 && b != 255) {
                b += 1
            }
        }
        this.data[this.data.length-1] = b
    }

    toString() {
        let s = this.version.toString() 
        s += "."
        s += bytesToBase64(int64ToBytes(this.startSecond))
        s += ".."
        s += bytesToBase64(this.data);
        s = s.replaceAll("=", "")
        return s 
    }

    toRandomart(size: "small" | "mid" | "large") {
        var sizeX:number, sizeY:number;
        switch (size) {
            case "small":
                sizeX = 5
                sizeY = 9
            case "mid":
                sizeX = 7
                sizeY = 13
            case "large":
                sizeX = 9
                sizeY = 17
        }
        const charSet = " .o-=/\\|^v<>OLS"

        var field = new Array<Array<number>>(sizeX);

        for (var i = 0; i < field.length; i++) {
            field[i] = new Array<number>(sizeY);
        }

        const maxChar = charSet.length - 1

        let x = Math.trunc(sizeX / 2)
        let y = Math.trunc(sizeY / 2)

        this.data.forEach((b: number) => {
            for (let j = 0; j < 4; j++) {
                if ((b & 0x1) > 0) {
                    x++
                } else {
                    x--
                }
                if ((b & 0x2) > 0) {
                    y++
                } else {
                    y--
                }
                if (x < 0) {
                    x = 0
                }
                if (x > sizeX-1) {
                    x = sizeX-1
                }
                if (y < 0) {
                    y = 0
                }
                if (y > sizeY-1) {
                    y = sizeY-1
                }
                let f = field[x][y] || 0
                if (f < maxChar-2) {
                    field[x][y] = f+1
                }
                b >>= 2 
            }
        })

        field[Math.trunc(sizeX/2)][Math.trunc(sizeY/2)] = maxChar - 1
        field[x][y] = maxChar

        let out = ""
        out += '╭'
        for (let i = 0; i < sizeX; i++) {
            out += '─'
        }
        out += '╮'
        out += '\n'

        for (let y = 0; y < sizeY; y++) {
            out += '│'
            for (let x = 0; x < sizeX; x++) {
                let f = field[x][y]
                console.log(x,y,f)
                if (!f) {
                    f = 0
                }
                out += charSet[f]
            }
            out += '│'
            out += '\n'
        }

        out += '╰'
        for (let i = 0; i < sizeX; i++) {
            out += '─'
        }
        out += '╯'

        return out 
    }
}

export function bytesToBase64(bytes : Uint8Array) {
    var binary = '';
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    let ascii = btoa( binary );
    ascii = ascii.replaceAll("+", "-")
    ascii = ascii.replaceAll("/", "_")
    return ascii;
}

export function int64ToBytes(num : number) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigInt64(0, BigInt(num), true); 
  return new Uint8Array(buffer);
}

export class AsigEvent {
    mouse : boolean = false ; 
    keyCode : string = "";
    text : string = "";
    controlPressed : boolean = false ;
    specialPressed : boolean = false ;
    shiftPressed : boolean = false ;
}
