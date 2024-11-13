create_sprite({
	id: "spr_surface",
	filepath: "assets/sprites/surface.png",
	frame_width: gm.TILE_SIZE,
	frame_height: gm.TILE_SIZE,
	frames: 1,
	origin_x: 0,
	origin_y: 0,
});

create_sprite({
	id: "spr_dirt",
	filepath: "assets/sprites/dirt.png",
	frame_width: gm.TILE_SIZE,
	frame_height: gm.TILE_SIZE,
	frames: 1,
	origin_x: 0,
	origin_y: 0,
});

create_layer({
	id: "lay_floor",
	cols: gm.LEVEL_SECTION_COLS,
	rows: gm.LEVEL_SECTION_ROWS,
	grid_size: gm.TILE_SIZE,
	tiles: [
		...Array.from({ length: gm.LEVEL_SECTION_COLS * 2 }, (_, i) => ({
			sprite: "spr_surface",
			frame_index: 0,
			x: i % gm.LEVEL_SECTION_COLS,
			y: gm.LEVEL_SECTION_ROWS - 3,
		})),
		...Array.from({ length: gm.LEVEL_SECTION_COLS * 2 }, (_, i) => ({
			sprite: "spr_dirt",
			frame_index: 0,
			x: i % gm.LEVEL_SECTION_COLS,
			y: gm.LEVEL_SECTION_ROWS - (Math.floor(i / gm.LEVEL_SECTION_COLS) + 1),
		})),
	],
});

create_object({
	id: "obj_layer_floor",
	tile_layer: "lay_floor",
});
