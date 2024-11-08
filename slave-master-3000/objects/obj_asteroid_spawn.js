create_spr({
	id: "spr_asteroid_spawn",
	filepath: "assets/sprites/asteroid_spawn.png",
	frame_width: 32,
	frame_height: 32,
	frames: 6,
	origin_x: 16,
	origin_y: 16,
});

create_obj({
	id: "obj_asteroid_spawn",
	sprite: "spr_asteroid_spawn",
	collision_mask: { type: "circle", geom: [14] },
	create: (self) => {
		self.speed = Math.random() + 0.25;
		self.image_speed = 10;
		self.image_angle = Math.random() * 360;
		self.player = instance_ref("player");
		self.direction = null;
		self.vx = 0;
		self.vy = 0;
		self.z = -1;
	},
	step: (dt, self) => {
		self.image_angle += 1;

		if (!self.direction) {
			self.direction = point_direction(self.x, self.y, self.player.x, self.player.y);
		}

		self.vx = Math.cos((self.direction * Math.PI) / 180) * self.speed;
		self.vy = Math.sin((self.direction * Math.PI) / 180) * self.speed;

		// Apply velocity
		self.x += self.vx;
		self.y += self.vy;
	},
	animation_end: (self) => {
		const asteroid = instance_create("obj_asteroid");
		asteroid.x = self.x;
		asteroid.y = self.y;
		asteroid.image_angle = self.image_angle;
		asteroid.direction = self.direction;
		asteroid.speed = self.speed;
		instance_destroy(self);
	},
});
