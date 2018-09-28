// ==UserScript==
// @name         Instrument Panel Ex
// @namespace    namespace001
// @version      1.0.1
// @description  ...
// @author       SaintJrOnline
// @grant        none
// @match        https://www.bitmex.com/*
// @match        https://testnet.bitmex.com/*
// ==/UserScript==



(() => {

const GUID = "_pd0230tpnslnqnweosolxx_";

const assert = (val, text = "Error...") => {
	if ( !val ) {
		alert(text);
		throw new Error(text);
	}
};

class EventEmitter {
	constructor() {
		this._events = new Map();
	}
	on(event, callback) {
		this._events.set(event, 
			(this._events.get(event) || []).concat([callback]) );
	}
	off(event, callback) {
		this._events.set(event, 
			(this._events.get(event) || []).filter(v => v !== callback) );
	}
	emit(event, ...args) {
		const callbacks = this._events.get(event);
		if ( callbacks ) {
			for(const callback of callbacks) {
				callback(...args);
			}
		}
	}
}
class SimpleBitmexRealtime extends EventEmitter {
	constructor(options) {
		super();
		
		this.options = Object.assign({
			testnet: false,
			
			pingTimeout: 5e3,
			pingTimeinterval: 1e3,
		}, options);
		
		this.socket = null;
		this.closed = false;
		
		setTimeout(this._newWebSocket.bind(this), 0);
		
		
		this._subscribes = new Map();
		
		this._events = new Map();
	}
	close() {
		this.closed = true;
		try {
			this.socket && this.socket.close();
		} catch(e) {}
	}
	
	_newWebSocket() {
		if ( this.closed ) {return;}
		
		this.socket = new WebSocket(!this.options.testnet ? "wss://www.bitmex.com/realtime" : "wss://testnet.bitmex.com/realtime");
		this.socket.binaryType = "arraybuffer";
		this.socket.onerror = () => {};
		this.socket.onopen = () => {
			this.emit("open");
			for(const [es] of this._subscribes) {
				this._sendOp("subscribe", [es]);
			}
		};
		this.socket.onclose = () => {
			this.socket = null;
			this.emit("close");
			
			setTimeout(() => {
				this._newWebSocket();
			}, 1e3);
		};
		this.socket.onmessage = (msg) => {
			try {
				msg = JSON.parse(msg.data);
				this.emit("message", msg);
				
				if ( typeof msg.table === "string" && typeof msg.action === "string" ) {
					this.emit(`${msg.action}@${msg.table}`, msg);
					this.emit(`*@${msg.table}`, msg);
				}
			} catch(e) {}
		};
	}
	
	subscribe(event, symbol) {
		const es = `${event}:${symbol}`;
		
		if ( !this._subscribes.has(es) ) {
			this._sendOp("subscribe", [es]);
		}
		this._subscribes.set(es, es);
	}
	unsubscribe(event, symbol) {
		const es = `${event}:${symbol}`;
		
		if ( this._subscribes.has(es) ) {
			this._sendOp("unsubscribe", [es]);
		}
		this._subscribes.delete(es);
	}
	
	_sendOp(op, args) {
		if ( this.socket && this.socket.readyState === this.socket.OPEN ) {
			this.socket.send(JSON.stringify({op, args}));
		}
		return false;
	}
	
}

class NumberToStringMaxLen {
	constructor() {
		this.ml = [0,0,0];
	}
	numberToString(n) {
		const s = n.toString();
		let [, sign, integ, fract] = s.match(/([+-])?(\d+)[.,]?(\d+)?/)

		if ( fract ) {
			this.ml[1] = Math.max(this.ml[1], fract.length);
			fract += "0".repeat(this.ml[1] - fract.length);
		} else if ( this.ml[1] ) {
			fract = "0".repeat(this.ml[1]);
		}
		
		if ( sign === "-" ) {
			this.ml[2] = 1;
		} else if ( this.ml[2] ) {
			sign = "+";
		} else {
			sign = "";
		}
		
		this.ml[0] = Math.max(this.ml[0], integ.length);
		integ = "0".repeat(this.ml[0] - integ.length) + integ;
		
		return sign + (fract ? integ + "." + fract : integ);
	}
}

class InstrumentPriceCtx {
	constructor(options) {
		this.symbol = null;
		this.lastPrice = null;
		
		Object.assign(this, options);
		
		this._render = () => {};
		
		this.ntsml = new NumberToStringMaxLen();
	}
	
	setRender(_render) {
		this._render = _render;
		this._view();
	}

	updateLastPrice(lastPrice) {
		if ( this.lastPrice === lastPrice ) {
			return;
		}
		this.lastPrice = lastPrice;
		this._view();
	}
	_view() {
		this._render(this.lastPrice === null ? "..." : this.ntsml.numberToString(this.lastPrice));
	}
}
class BitmexInstrumentPanelEx {
	constructor(options) {
		this.options = options;
		
		this.symbols = {};
		
		this.options.realtime.on("partial@instrument", (msg) => {
			const last = msg.data.pop();
			if ( last ) {
				const ctx = this.symbols[last.symbol];
				ctx && ctx.updateLastPrice(last.lastPrice);
			}
		});
		this.options.realtime.on("insert@trade", (msg) => {
			const last = msg.data.pop();
			if ( last ) {
				const ctx = this.symbols[last.symbol];
				ctx && ctx.updateLastPrice(last.price);
			}
		});
		
		this.uid = "_"+ (Math.random()+'').substr(2)+(Math.random()+'').substr(2)+(Math.random()+'').substr(2)+(Math.random()+'').substr(2) +"_";
		this._updateLoop();
		window.addEventListener("resize", this._update.bind(this));
	}
	
	_updateLoop() {
		this._update();
		
		setTimeout(this._updateLoop.bind(this), 1e3);
	}
	_update() {
		const an = this.uid + "isset";
		
		const _sel_0 = "section.instrumentSelectorPanel  ul.nav.nav-tabs > li > .tabTitle > .innerTitle";
		const _sel_f_0 = ".instrument [data-symbol]";
		const _sel_f_1 = `span[${an}]`;
		const _sel_1 = `${_sel_0} > ${_sel_f_1}`;

		const $list0 = document.querySelectorAll(_sel_0);
		const $list1 = document.querySelectorAll(_sel_1);
		
		if ( $list0.length === $list1.length ) {return;}
		
		console.log("Instrument panel adding items(%s)...", $list0.length - $list1.length);
		for(const $item of $list0) {
			if ( !$item.querySelector(_sel_f_0) ) {continue;}
			if ( $item.querySelector(_sel_f_1) ) {continue;}

			const symbol = $item.querySelector(_sel_f_0).getAttribute('data-symbol');
			
			const $span = document.createElement("span");
			$span.setAttribute(an, symbol);
			$item.appendChild($span);
			
			this._getCtx(symbol).setRender(text => $span.innerText = text);
		}
	}
	
	_getCtx(symbol) {
		const ctx = this.symbols[symbol] = this.symbols[symbol] || new InstrumentPriceCtx({symbol});
		
		this.options.realtime.subscribe("instrument", symbol);
		this.options.realtime.subscribe("trade", symbol);
		
		return ctx;
	}
}

if ( window[GUID] ) {
	return;
}

if ( window.top !== window ) {
	return;
}

const HOST = "www.bitmex.com";
const HOST_TESTNET = "testnet.bitmex.com";

if ( ![HOST, HOST_TESTNET].includes(location.hostname) ) {return;}

const IsTestnet = location.hostname === HOST_TESTNET;

const ctx = window[GUID] = {};
ctx.realtime = new SimpleBitmexRealtime({testnet: IsTestnet});
ctx.bipe = new BitmexInstrumentPanelEx({realtime: ctx.realtime});

})();
