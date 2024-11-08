create_spr({
	id: "spr_asteroid",
	filepath: "assets/sprites/asteroid.png",
	frame_width: 32,
	frame_height: 32,
	frames: 4,
	origin_x: 16,
	origin_y: 16,
});

create_obj({
	id: "obj_asteroid",
	sprite: "spr_asteroid",
	collision_mask: { type: "circle", geom: [14] },
	create: (self) => {
		self.speed = 0;
		self.angle_speed = 1;
		self.vx = 0;
		self.vy = 0;
		self.player = instance_ref("player");
		self.direction = null;
		self.image_scale_x = 1 * self.mass * 0.5;
		self.image_scale_y = 1 * self.mass * 0.5;
		self.image_speed = 0;
		self.room = gm.rooms[gm.current_room];
		self.hits_to_destroy = 40;
		self.z = 1;
	},
	destroy: (self) => {
		for (let i = 0; i < Math.random() * 6 + 3; i++) {
			const rock = instance_create("obj_rock");
			rock.x = self.x + Math.random() * 16 - 8;
			rock.y = self.y + Math.random() * 16 - 8;
		}
	},
	step: (dt, self) => {
		if (self.hits_to_destroy <= 0) {
			instance_destroy(self);
			return;
		}

		self.image_index = Math.ceil(self.hits_to_destroy / 10);

		if (self.image_index === 0) {
			self.collision_mask = { type: "circle", geom: [14] };
		} else if (self.image_index === 1) {
			self.collision_mask = { type: "circle", geom: [12] };
		} else if (self.image_index === 2) {
			self.collision_mask = { type: "circle", geom: [10] };
		} else if (self.image_index === 3) {
			self.collision_mask = { type: "circle", geom: [8] };
		}

		if (!self.direction) {
			self.direction = point_direction(self.x, self.y, self.player.x, self.player.y);
		}

		if (instances_collided(self, self.player)) {
			self.player.health -= self.hits_to_destroy / 20;
			self.room.camera.shake = 10;
			if (Math.random() < 0.5) {
				const rock = instance_create("obj_rock");
				rock.x = self.x + Math.random() * 16 - 8;
				rock.y = self.y + Math.random() * 16 - 8;
			}

			self.hits_to_destroy--;
			const rotation_factor = 5;

			// Bounce the player away
			const collision_angle = point_direction(self.x, self.y, self.player.x, self.player.y);
			const bounce_speed = self.speed * 1.5;
			self.player.vx += Math.cos((collision_angle * Math.PI) / 180) * bounce_speed;
			self.player.vy += Math.sin((collision_angle * Math.PI) / 180) * bounce_speed;

			self.speed *= 1.1;
			self.angle_speed += (Math.random() - 0.5) * rotation_factor * self.player.speed;
			self.player.direction += (Math.random() - 0.5) * rotation_factor * self.speed;

			self.direction = -self.direction + Math.random() * 180;
		}

		// Check collision with other asteroids
		const asteroids = self.room.object_index["obj_asteroid"];
		for (const other_id of asteroids) {
			if (other_id !== self.id) {
				const other = self.room.instances[other_id];
				if (instances_collided(self, other)) {
					if (Math.random() < 0.5) {
						const rock = instance_create("obj_rock");
						rock.x = self.x + Math.random() * 16 - 8;
						rock.y = self.y + Math.random() * 16 - 8;
					}

					self.hits_to_destroy--;
					const rotation_factor = 5;
					self.angle_speed += (Math.random() - 0.5) * rotation_factor * other.speed;
					other.angle_speed += (Math.random() - 0.5) * rotation_factor * self.speed;

					self.direction = -self.direction + Math.random() * 180;
				}
			}
		}

		self.vx = Math.cos((self.direction * Math.PI) / 180) * self.speed;
		self.vy = Math.sin((self.direction * Math.PI) / 180) * self.speed;

		// Apply rotation
		self.image_angle += self.angle_speed;

		// Dampen rotation speed
		self.angle_speed *= 0.98;

		if (self.angle_speed < 0.1) {
			self.angle_speed = 0.1;
		}

		if (self.speed < 0.1) {
			self.speed = 0.1;
		}

		if (self.speed > 5) {
			self.speed = 5;
		}

		if (self.angle_speed > 5) {
			self.angle_speed = 5;
		}

		// Apply velocity
		self.x += self.vx;
		self.y += self.vy;

		// Dampen velocity (optional, for smoother movement)
		self.vx *= 0.95;
		self.vy *= 0.95;
	},
});
