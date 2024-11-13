create_sprite({
	id: "spr_question",
	filepath: "assets/sprites/question.png",
	frame_width: gm.TILE_SIZE,
	frame_height: gm.TILE_SIZE,
	frames: 5,
	origin_x: 0,
	origin_y: 0,
});

create_sprite({
	id: "spr_question_disabled",
	filepath: "assets/sprites/question.png",
	frame_width: gm.TILE_SIZE,
	frame_height: gm.TILE_SIZE,
	frames: 6,
	origin_x: 0,
	origin_y: 0,
});

create_object({
	id: "obj_question",
	sprite: "spr_question",
	collision_mask: {
		type: "rect",
		geom: [0, 0, gm.TILE_SIZE, gm.TILE_SIZE],
	},
	create: (self) => {
		self.was_hit = false;
		self.image_speed = 4;
	},
	step: (dt, self) => {
		if (self.was_hit) {
			self.sprite = "spr_question_disabled";
			self.image_index = 5;
			self.image_speed = 0;
		}
	},
});
