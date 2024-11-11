create_room({
	id: "rm_main",
	width: 640,
	height: 480,
	camera: {
		x: 0,
		y: 0,
		width: 640,
		height: 480,
		viewport_width: 640,
		viewport_height: 480,
		// follow: "obj_player", // Uncomment to follow object
	},
	fps: 60,
	bg_color: "#000000",
	setup: () => {
		const room = room_current();

		return [
			{
				id: "obj_layer",
				x: 0,
				y: 0,
				z: -1,
			},
			{
				id: "obj_player",
				x: 12,
				y: 12,
			},
		];
	},
});
