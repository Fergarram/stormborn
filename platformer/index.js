import Stormborn from "./stormborn.js";

// Expose all Stormborn functions to the global scope
Object.assign(window, Stormborn);

// Create game runtime object
const game = create_game({
	title: "Platformer",
	description: "A mario-like platformer game",
	image_smoothing_enabled: false, // Set to false for pixel art
	container: document.getElementById("game"),
	debug: false,
});

// Expose all game runtime functions to the global scope
Object.assign(window, game);

// Globals
gm.TILE_SIZE = 8;
gm.LEVEL_SECTION_WIDTH = 200;
gm.LEVEL_SECTION_HEIGHT = 120;
gm.LEVEL_SECTION_COLS = gm.LEVEL_SECTION_WIDTH / gm.TILE_SIZE;
gm.LEVEL_SECTION_ROWS = gm.LEVEL_SECTION_HEIGHT / gm.TILE_SIZE;

// Start the game
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_level_1");
	});
});
