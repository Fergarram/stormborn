const button_a = document.getElementById("button_a");
const button_b = document.getElementById("button_b");

function simulate_key_event(key_code, type) {
	const event = new KeyboardEvent(type, {
		key: key_code,
		code: key_code,
		keyCode: key_code.charCodeAt(0),
		which: key_code.charCodeAt(0),
		bubbles: true,
		cancelable: true,
	});
	document.dispatchEvent(event);
}

// For touch devices
button_a.addEventListener("touchstart", (e) => {
	e.preventDefault();
	simulate_key_event("a", "keydown");
});

button_a.addEventListener("touchend", (e) => {
	e.preventDefault();
	simulate_key_event("a", "keyup");
});

button_b.addEventListener("touchstart", (e) => {
	e.preventDefault();
	simulate_key_event("b", "keydown");
});

button_b.addEventListener("touchend", (e) => {
	e.preventDefault();
	simulate_key_event("b", "keyup");
});

// For mouse clicks
button_a.addEventListener("mousedown", () => simulate_key_event("a", "keydown"));
button_a.addEventListener("mouseup", () => simulate_key_event("a", "keyup"));
button_b.addEventListener("mousedown", () => simulate_key_event("b", "keydown"));
button_b.addEventListener("mouseup", () => simulate_key_event("b", "keyup"));
