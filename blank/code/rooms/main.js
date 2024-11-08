create_sprite({
	id: "spr_tile",
	filepath: "assets/sprites/tile.png",
	frame_width: 247,
	frame_height: 247,
	frames: 1,
});

create_layer({
	id: "tile_main",
	width: 2,
	height: 2,
	grid_size: 247,
	tiles: [
		{
			sprite: "spr_tile",
			frame_index: 0,
			x: 0,
			y: 0,
		},
		{
			sprite: "spr_tile",
			frame_index: 0,
			x: 123,
			y: 123,
		},
	],
});

create_object({
	id: "obj_layer",
	tile_layer: "tile_main",
	create: (self) => {
		self.z = -1;
	},
});

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
			},
			{
				id: "obj_player",
				x: room.width / 2,
				y: room.height / 2,
			},
		];
	},
});
