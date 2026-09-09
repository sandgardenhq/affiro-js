import { Asig, AsigEvent } from "./alg"

export class Monitor {
	sig : Asig; 

	constructor() {
		this.sig = new Asig();
		window.addEventListener("mouseup", ( { isTrusted }) => {
			//console.log("mouse event", isTrusted)
			if (isTrusted) {
				let ev = new AsigEvent();
				ev.mouse = true ;
				this.sig.writeEvent(ev);
			}
		}, true);
		window.addEventListener("keydown", ( { isTrusted, code, key, shiftKey, ctrlKey, metaKey }) => {
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
}
