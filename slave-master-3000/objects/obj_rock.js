create_spr({
	id: "spr_rock",
	filepath: "assets/sprites/rock.png",
	frame_width: 16,
	frame_height: 16,
	frames: 3,
	origin_x: 8,
	origin_y: 8,
});

create_obj({
	id: "obj_rock",
	sprite: "spr_rock",
	collision_mask: { type: "circle", geom: [4] },
	create: (self) => {
		self.speed = Math.random() * 1 + 0.01;
		self.direction = Math.random() * 360;
		self.image_index = Math.floor(Math.random() * 2);
		self.image_speed = 10;
	},
	step: (dt, self) => {
		self.x += Math.cos((self.direction * Math.PI) / 180) * self.speed;
		self.y += Math.sin((self.direction * Math.PI) / 180) * self.speed;
		self.speed *= 0.98;
		self.image_angle += 1;
	},
	animation_end: (self) => {
		instance_destroy(self);
	},
});
