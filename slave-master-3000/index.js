import Stormborn from "./stormborn.js";

// Expose all Stormborn functions to the global scope
Object.assign(window, Stormborn);

// Create game runtime object
const game = create_game({
	title: "Slave Master 3000",
	description: "A simple top-down shooter game",
	image_smoothing_enabled: false,
	container: document.getElementById("game"),
	debug: false,
});

// Expose all game runtime functions to the global scope
Object.assign(window, game);

// Start the game
window.addEventListener("load", () => {
	run_game(() => {
		gm.canvas.style.cursor = "crosshair";
		room_goto("rm_main");
	});
});
