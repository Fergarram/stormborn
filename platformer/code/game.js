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
