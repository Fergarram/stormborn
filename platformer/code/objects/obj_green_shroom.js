create_object({
	id: "obj_player",
	sprite: "spr_player",
	collision_mask: { type: "circle", geom: [9] },
	create: (self) => {
		self.max_speed = 3;
		instance_save("inst_player", self);
	},
	step: (dt, self) => {},
});
