// CREATE ROOM
create_room({
	id: "rm_game",
	width: config.viewport_width / config.scale,
	height: config.viewport_height / config.scale,
	camera: {
		x: 0,
		y: 0,
		get viewport_width() {
			const width_ratio = window.innerWidth / config.viewport_width;
			const height_ratio = window.innerHeight / config.viewport_height;
			const scale = Math.min(width_ratio, height_ratio);
			return Math.floor(config.viewport_width * scale);
		},
		get viewport_height() {
			const width_ratio = window.innerWidth / config.viewport_width;
			const height_ratio = window.innerHeight / config.viewport_height;
			const scale = Math.min(width_ratio, height_ratio);
			return Math.floor(config.viewport_height * scale);
		},
	},
	fps: 60,
	bg_color: "#555555",
	setup() {
		return [];
	},
});

// CONFIG
window.config = {
	viewport_width: 320,
	viewport_height: 240,
	scale: 1,
};

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
