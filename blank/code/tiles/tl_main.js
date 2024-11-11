create_layer({
	id: "tile_main",
	cols: 3,
	rows: 3,
	grid_size: 42,
	tiles: [
		{
			sprite: "spr_tile",
			frame_index: 0,
			x: 0,
			y: 0,
		},
		{
			sprite: "spr_tile",
			frame_index: 1,
			x: 1,
			y: 1,
		},
		{
			sprite: "spr_tile",
			frame_index: 4,
			x: 2,
			y: 1,
		},
	],
});

create_object({
	id: "obj_layer",
	tile_layer: "tile_main",
});
