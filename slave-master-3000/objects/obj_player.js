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
	loop: false,
});

create_obj({
	id: "obj_player",
	sprite: "spr_player",
	collision_mask: { type: "circle", geom: [9] },
	create: (self) => {
		self.max_speed = 3;
		self.acceleration = 0.5;
		self.friction = 0.075;
		self.vx = 0;
		self.vy = 0;
		self.shoot_cooldown = 0;
		self.health = 100;
		self.asteroid_count = 0;
		self.gold = 0;
		self.time_alive = 0;
		instance_save("player", self);
	},
	step: (dt, self) => {
		self.time_alive += dt;

		// Movement with acceleration
		let ax = 0,
			ay = 0;
		if (gm.keys_pressed["a"]) {
			ax -= self.acceleration;
			create_movement_spark(self, "right");
		}
		if (gm.keys_pressed["d"]) {
			ax += self.acceleration;
			create_movement_spark(self, "left");
		}
		if (gm.keys_pressed["w"]) {
			ay -= self.acceleration;
			create_movement_spark(self, "bottom");
		}
		if (gm.keys_pressed["s"]) {
			ay += self.acceleration;
			create_movement_spark(self, "top");
		}

		// Apply acceleration
		self.vx += ax;
		self.vy += ay;

		// Apply friction
		self.vx *= 1 - self.friction;
		self.vy *= 1 - self.friction;

		// Limit speed
		const speed = Math.sqrt(self.vx * self.vx + self.vy * self.vy);
		if (speed > self.max_speed) {
			const ratio = self.max_speed / speed;
			self.vx *= ratio;
			self.vy *= ratio;
		}

		// Update position
		self.x += self.vx;
		self.y += self.vy;

		// Rotation towards mouse
		const room = gm.rooms[gm.current_room];
		self.image_angle = point_direction(self.x, self.y, room.camera.x + gm.mouse_x, room.camera.y + gm.mouse_y);

		// Shooting
		if (self.shoot_cooldown > 0) self.shoot_cooldown--;

		if (gm.mouse_buttons_pressed[0] && self.shoot_cooldown === 0) {
			const bullet = instance_create("obj_bullet");
			bullet.x = self.x;
			bullet.y = self.y;
			bullet.direction = self.image_angle;
			bullet.image_angle = self.image_angle;
			self.shoot_cooldown = 10;
			play_sound("snd_shoot");
		}
	},
});

function create_movement_spark(player, side) {
	if (Math.random() < 0.2) {
		// Adjust this value to control spark frequency
		const spark = instance_create("obj_spark");
		spark.z = -1;
		spark.sprite = "spr_rock";
		spark.image_scale_x = 0.2;
		spark.image_scale_y = 0.2;
		spark.lifespan = 10;
		const offset = 5;

		switch (side) {
			case "left":
				spark.x = player.x - offset;
				spark.y = player.y;
				spark.direction = 0;
				break;
			case "right":
				spark.x = player.x + offset;
				spark.y = player.y;
				spark.direction = 180;
				break;
			case "top":
				spark.x = player.x;
				spark.y = player.y - offset;
				spark.direction = 90;
				break;
			case "bottom":
				spark.x = player.x;
				spark.y = player.y + offset;
				spark.direction = 270;
				break;
		}

		spark.direction += Math.random() * 30 - 15; // Add some randomness to direction
	}
}
