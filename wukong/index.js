import Stormborn from "./stormborn.js";

// Expose all Stormborn functions to the global scope
Object.assign(window, Stormborn);

// Create game runtime object
const game = create_game({
	title: "Jump",
	description: "Flappy bird clone",
	image_smoothing_enabled: false, // Set to false for pixel art
	container: document.getElementById("game"),
	debug: false,
});

// Expose all game runtime functions to the global scope
Object.assign(window, game);

// CONFIG
window.VIEWPORT_WIDTH = 240;
window.VIEWPORT_HEIGHT = 320;
window.SCALE = 1;