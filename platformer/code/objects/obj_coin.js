create_sprite({
	id: "spr_coin",
	filepath: "assets/sprites/coin.png",
	frame_width: 6,
	frame_height: 8,
	frames: 1,
	origin_x: 3,
	origin_y: 4,
});

create_object({
	id: "obj_coin",
	sprite: "spr_coin",
	collision_mask: {
		type: "rect",
		geom: [-3, -4, 6, 8],
	},
	create: (self) => {},
	step: (dt, self) => {
		if (objects_colliding(self, "obj_player").length > 0) {
			instance_destroy(self);
		}
	},
});
