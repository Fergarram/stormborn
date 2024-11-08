create_spr({
	id: "spr_player",
	filepath: "assets/sprites/player.png",
	frame_width: 32,
	frame_height: 32,
	frames: 1,
	origin_x: 16,
	origin_y: 16,
});

create_snd({
	id: "snd_shoot",
	filepath: "assets/sounds/pop.mp3",
	volume: 0.5,
});

create_obj({
	id: "obj_player",
	sprite: "spr_player",
	collision_mask: { type: "circle", geom: [9] },
	create: (self) => {
		self.max_speed = 3;
		instance_save("inst_player", self);
	},
	step: (dt, self) => {},
});
