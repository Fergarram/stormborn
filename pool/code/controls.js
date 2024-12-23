// Get all button elements
const buttons = {
	1: document.getElementById("button_1"),
	2: document.getElementById("button_2"),
	3: document.getElementById("button_3"),
	4: document.getElementById("button_4"),
	5: document.getElementById("button_5"),
	6: document.getElementById("button_6"),
	7: document.getElementById("button_7"),
	8: document.getElementById("button_8"),
	9: document.getElementById("button_9"),
	0: document.getElementById("button_0"),
	"*": document.getElementById("button_star"),
	"#": document.getElementById("button_hash"),
};

function simulate_key_event(key_code, type) {
	const event = new KeyboardEvent(type, {
		key: key_code,
		code: key_code,
		keyCode: typeof key_code === "string" ? key_code.charCodeAt(0) : key_code,
		which: typeof key_code === "string" ? key_code.charCodeAt(0) : key_code,
		bubbles: true,
		cancelable: true,
	});
	document.dispatchEvent(event);
}

// Add event listeners for each button
Object.entries(buttons).forEach(([key, button]) => {
	// For touch devices
	button.addEventListener("touchstart", (e) => {
		e.preventDefault();
		simulate_key_event(key, "keydown");
	});

	button.addEventListener("touchend", (e) => {
		e.preventDefault();
		simulate_key_event(key, "keyup");
	});

	// For mouse clicks
	button.addEventListener("mousedown", () => simulate_key_event(key, "keydown"));
	button.addEventListener("mouseup", () => simulate_key_event(key, "keyup"));
});
