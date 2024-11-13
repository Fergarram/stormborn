create_sprite({
	id: "spr_brick",
	filepath: "assets/sprites/brick.png",
	frame_width: gm.TILE_SIZE,
	frame_height: gm.TILE_SIZE,
	frames: 1,
	origin_x: 0,
	origin_y: 0,
});

create_object({
	id: "obj_brick",
	sprite: "spr_brick",
	collision_mask: {
		type: "rect",
		geom: [0, 0, gm.TILE_SIZE, gm.TILE_SIZE],
	},
	create: (self) => {
		self.was_hit = false;
	},
	step: (dt, self) => {
		if (self.was_hit) {
			instance_destroy(self);
		}
	},
});
