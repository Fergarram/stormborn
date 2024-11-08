create_room({
	id: "rm_main",
	width: 3000,
	height: 3000,
	camera: {
		x: 0,
		y: 0,
		room_width: window.innerWidth / 2,
		room_height: window.innerHeight / 2,
		viewport_width: window.innerWidth,
		viewport_height: window.innerHeight,
		follow: "obj_player",
	},
	fps: 120,
	bg_color: "#000000",
	setup: () => [
		{ x: 800 / 2, y: 600 / 2, obj: "obj_player" },
		{ x: 0, y: 0, obj: "obj_ctrl" },
	],
});
