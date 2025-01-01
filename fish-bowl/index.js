import Stormborn from "./stormborn.js";

// Expose all Stormborn functions to the global scope
Object.assign(window, Stormborn);

// Create game runtime object
const game = create_game({
	title: "Fish Bowl",
	description: "Actual fish bowl.",
	image_smoothing_enabled: false, // Set to false for pixel art
	container: document.getElementById("game"),
	debug: false,
});

// Expose all game runtime functions to the global scope
Object.assign(window, game);

// CONFIG
window.config = {
	viewport_width: 64 * 4,
	viewport_height: 64 * 4,
	scale: 4,
};
