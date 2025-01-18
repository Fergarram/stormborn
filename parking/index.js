import Stormborn from "./stormborn.js";

// Expose all Stormborn functions to the global scope
Object.assign(window, Stormborn);

// Create game runtime object
const game = create_game({
	title: "Car Parking",
	description: "Actual car parking game.",
	image_smoothing_enabled: false, // Set to false for pixel art
	shape_smoothing_enabled: false,
	container: document.getElementById("game"),
	debug: false,
});

// Expose all game runtime functions to the global scope
Object.assign(window, game);
