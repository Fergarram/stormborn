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

const game_element = document.getElementById("game");
let current_rotation = 0;

function rotate_game(direction) {
	if (direction === "right") {
		current_rotation += 90;
	} else {
		current_rotation -= 90;
	}

	// Apply rotation
	game_element.firstElementChild.style.transform = `rotate(${current_rotation}deg)`;

	// Update classes for dimension handling
	game_element.firstElementChild.classList.remove("rotated-0", "rotated-90", "rotated-180", "rotated-270");
	game_element.firstElementChild.classList.add(`rotated-${current_rotation}`);
}

function handle_rotation_key(key) {
	switch (key) {
		case "1":
			rotate_game("left");
			break;
		case "3":
			rotate_game("right");
			break;
		case "7":
			rotate_game("left");
			break;
		case "9":
			rotate_game("right");
			break;
	}
}

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

	// Only handle rotation on keydown
	if (type === "keydown") {
		handle_rotation_key(key_code);
	}
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
