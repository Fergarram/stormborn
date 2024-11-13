create_room({
	id: "rm_level_1",
	width: gm.LEVEL_SECTION_WIDTH,
	height: gm.LEVEL_SECTION_HEIGHT,
	camera: {
		x: 0,
		y: 0,
		width: gm.LEVEL_SECTION_WIDTH,
		height: gm.LEVEL_SECTION_HEIGHT,
		viewport_width: gm.LEVEL_SECTION_WIDTH * 3,
		viewport_height: gm.LEVEL_SECTION_HEIGHT * 3,
		// follow: "obj_player",
	},
	fps: 60,
	bg_color: "#8a8a8a",
	setup: () => {
		const room = room_current();
		const objects = [];

		// Create floor tile layer
		objects.push({
			id: "obj_layer_floor",
			x: 0,
			y: 0,
			z: -1,
		});

		// Add player
		objects.push({
			id: "obj_player",
			x: room.width / 2,
			y: room.height / 2,
		});

		// Create main ground
		objects.push({
			id: "obj_floor",
			x: 0,
			y: (gm.LEVEL_SECTION_ROWS - 3) * gm.TILE_SIZE,
			mask: {
				type: "rect",
				geom: [0, 0, gm.TILE_SIZE * gm.LEVEL_SECTION_COLS, gm.TILE_SIZE],
			},
		});

		// Add bricks
		objects.push({
			id: "obj_brick",
			x: 3 * gm.TILE_SIZE,
			y: (gm.LEVEL_SECTION_ROWS - 7) * gm.TILE_SIZE,
		});
		objects.push({
			id: "obj_brick",
			x: 4 * gm.TILE_SIZE,
			y: (gm.LEVEL_SECTION_ROWS - 7) * gm.TILE_SIZE,
		});
		objects.push({
			id: "obj_brick",
			x: 2 * gm.TILE_SIZE,
			y: (gm.LEVEL_SECTION_ROWS - 11) * gm.TILE_SIZE,
		});
		objects.push({
			id: "obj_brick",
			x: 5 * gm.TILE_SIZE,
			y: (gm.LEVEL_SECTION_ROWS - 11) * gm.TILE_SIZE,
		});

		// Add question blocks
		objects.push({
			id: "obj_question",
			x: 3 * gm.TILE_SIZE,
			y: (gm.LEVEL_SECTION_ROWS - 11) * gm.TILE_SIZE,
		});
		objects.push({
			id: "obj_question",
			x: 4 * gm.TILE_SIZE,
			y: (gm.LEVEL_SECTION_ROWS - 11) * gm.TILE_SIZE,
		});

		// Add coins
		objects.push({
			id: "obj_coin",
			x: 3 * gm.TILE_SIZE + 4,
			y: (gm.LEVEL_SECTION_ROWS - 12) * gm.TILE_SIZE + 4,
		});
		objects.push({
			id: "obj_coin",
			x: 4 * gm.TILE_SIZE + 4,
			y: (gm.LEVEL_SECTION_ROWS - 12) * gm.TILE_SIZE + 4,
		});

		return objects;
	},
});
