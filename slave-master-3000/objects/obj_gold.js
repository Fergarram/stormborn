create_spr({
	id: "spr_gold",
	filepath: "assets/sprites/gold.png",
	frame_width: 5,
	frame_height: 5,
	frames: 2,
	origin_x: 2,
	origin_y: 2,
});

create_obj({
	id: "obj_gold",
	sprite: "spr_gold",
	collision_mask: { type: "circle", geom: [3] },
	create: (self) => {
		self.speed = Math.random() * 0.1 + 0.1;
		self.vx = 0;
		self.vy = 0;
		self.direction = Math.random() * 360;
		self.image_angle = Math.random() * 360;
		self.mass = Math.random() * 0.5 + 0.5;
		self.image_scale_x = self.mass;
		self.image_scale_y = self.mass;
		self.image_speed = 15;
		self.angle_speed = Math.random() * 2 - 1;
		self.room = gm.rooms[gm.current_room];
		self.lifespan = 300 + Math.random() * 300;
		self.player = instance_ref("player");
		self.attraction_radius = 35;
		self.max_attraction_speed = 4;
	},
	step: (dt, self) => {
		let distance_to_player = point_distance(self.x, self.y, self.player.x, self.player.y);

		if (distance_to_player < self.attraction_radius) {
			let attraction_strength = 1 - distance_to_player / self.attraction_radius;
			let angle_to_player = point_direction(self.x, self.y, self.player.x, self.player.y);

			self.vx += Math.cos((angle_to_player * Math.PI) / 180) * attraction_strength * self.max_attraction_speed;
			self.vy += Math.sin((angle_to_player * Math.PI) / 180) * attraction_strength * self.max_attraction_speed;
		} else {
			self.vx = Math.cos((self.direction * Math.PI) / 180) * self.speed;
			self.vy = Math.sin((self.direction * Math.PI) / 180) * self.speed;
		}

		// Limit speed
		let current_speed = Math.sqrt(self.vx * self.vx + self.vy * self.vy);
		if (current_speed > self.max_attraction_speed) {
			self.vx = (self.vx / current_speed) * self.max_attraction_speed;
			self.vy = (self.vy / current_speed) * self.max_attraction_speed;
		}

		self.x += self.vx;
		self.y += self.vy;

		self.image_angle += self.angle_speed;
		self.angle_speed *= 0.99;

		self.lifespan--;
		if (self.lifespan <= 0) {
			instance_destroy(self);
		}

		// Fade out
		if (self.lifespan < 60) {
			self.image_alpha = self.lifespan / 60;
		}

		if (instances_collided(self, self.player)) {
			self.player.gold++;
			instance_destroy(self);
		}
	},
});
