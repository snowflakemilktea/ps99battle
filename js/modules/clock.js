"use strict";

class ClockEvent extends Event {
	constructor(tick, time) {
		super(tick);
		this.currentTime = time;
	}
}
export class Clock extends EventTarget {
	constructor() {
		super();
		this.sync();
	}
	
	sync() {
		const $this = this;
		$.get("https://timeapi.io/api/time/current/zone?timeZone=UTC", (a)=>{
			$this.serverTime = +new Date(a.dateTime+"Z");
			$this.localTime = +new Date();
			$this.tick();
		});
	}
	
	tick() {
		const currentTime = +new Date();
		this.serverTime += currentTime - this.localTime;
		this.localTime = currentTime;
		let milliOffset = this.serverTime % 1000;
		this.dispatchEvent(new ClockEvent("tick", this.serverTime-milliOffset));
		setTimeout((a)=>a.tick(), 1000 - milliOffset, this);
	}
}