// GLOBALS
const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 240;
const SCALE = 1;

// CREATE ROOM
create_room({
	id: "rm_game",
	width: ROOM_WIDTH,
	height: ROOM_HEIGHT,
	screen: {
		width: ROOM_WIDTH,
		height: ROOM_HEIGHT,
		final_width: ROOM_WIDTH * SCALE,
		final_height: ROOM_HEIGHT * SCALE,
	},
	cameras: [
		{
			id: "main",
			x: 0,
			y: 0,
			screen_x: 0,
			screen_y: 0,
			width: ROOM_WIDTH,
			height: ROOM_HEIGHT,
			active: true,
		},
	],
	fps: 60,
	bg_color: "#555555",
	setup() {
		return [];
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
