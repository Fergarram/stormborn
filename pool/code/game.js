// OBJECTS
create_object({
	id: "obj_ball",
	sprite: "spr_balls",
	collision_mask: { type: "circle", geom: [8] },
	create(self) {
		self.speed_x = 0;
		self.speed_y = 0;
		self.friction = 0.98;
		self.ball_number = 0;
		self.image_speed = 0;
	},
	step(dt, self) {
		const wall_size = 23;

		// Set rotation based on movement direction
		if (self.speed_x !== 0 || self.speed_y !== 0) {
			self.image_angle = point_direction(0, 0, self.speed_x, self.speed_y);
		}

		// Apply movement
		self.x += self.speed_x;
		self.y += self.speed_y;

		// Apply friction
		self.speed_x *= self.friction;
		self.speed_y *= self.friction;

		// Stop if speed is very low
		if (Math.abs(self.speed_x) < 0.01) self.speed_x = 0;
		if (Math.abs(self.speed_y) < 0.01) self.speed_y = 0;

		// Bounce off walls
		if (self.x < wall_size || self.x > config.viewport_width / config.scale - wall_size) {
			self.speed_x *= -0.8;
			self.x = Math.min(Math.max(self.x, wall_size), config.viewport_width / config.scale - wall_size);
		}
		if (self.y < wall_size || self.y > config.viewport_height / config.scale - wall_size) {
			self.speed_y *= -0.8;
			self.y = Math.min(Math.max(self.y, wall_size), config.viewport_height / config.scale - wall_size);
		}

		// Ball collision
		const other_balls = objects_colliding(self, "obj_ball");
		for (const other of other_balls) {
			if (other.id === self.id) continue;

			// Calculate collision response
			const dx = other.x - self.x;
			const dy = other.y - self.y;
			const dist = point_distance(self.x, self.y, other.x, other.y);

			if (dist < 16) {
				// If balls are overlapping
				// Move balls apart
				const angle = Math.atan2(dy, dx);
				const overlap = 16 - dist;

				self.x -= (Math.cos(angle) * overlap) / 2;
				self.y -= (Math.sin(angle) * overlap) / 2;
				other.x += (Math.cos(angle) * overlap) / 2;
				other.y += (Math.sin(angle) * overlap) / 2;

				// Calculate normal vector
				const nx = dx / dist;
				const ny = dy / dist;

				// Calculate relative velocity
				const dvx = other.speed_x - self.speed_x;
				const dvy = other.speed_y - self.speed_y;

				// Calculate impulse
				const impulse = (dvx * nx + dvy * ny) * 0.95;

				// Apply impulse to both balls
				self.speed_x += impulse * nx;
				self.speed_y += impulse * ny;
				other.speed_x -= impulse * nx;
				other.speed_y -= impulse * ny;
			}
		}
	},
});

create_object({
	id: "obj_cue",
	sprite: "spr_cue",
	create(self) {
		self.power = 0;
		self.max_power = 15;
		self.pulling = false;
	},
	step(dt, self) {
		const white_ball = instance_get("white_ball");
		if (!white_ball) return;

		if (!is_any_ball_moving()) {
			// Point cue at mouse
			const angle = point_direction(white_ball.x, white_ball.y, gm.mouse_x, gm.mouse_y);
			self.image_angle = angle;
			self.x = white_ball.x;
			self.y = white_ball.y;

			// Handle shooting
			if (gm.mouse_buttons_pressed[0]) {
				self.pulling = true;
				self.power = Math.min(self.power + 0.5, self.max_power);
			} else if (self.pulling) {
				// Shoot!
				const rad_angle = (self.image_angle * Math.PI) / 180;
				white_ball.speed_x = Math.cos(rad_angle) * self.power;
				white_ball.speed_y = Math.sin(rad_angle) * self.power;
				self.power = 0;
				self.pulling = false;
			}
		}
	},
	draw(self) {
		if (self.pulling) {
			// Draw power meter
			gm.ctx.fillStyle = "red";
			gm.ctx.fillRect(10, 10, (self.power / self.max_power) * 100, 10);
		}
	},
});

// Helper function
function is_any_ball_moving() {
	const room = room_current();
	for (const inst_id in room.instances) {
		const inst = room.instances[inst_id];
		if (inst.object_id === "obj_ball") {
			if (Math.abs(inst.speed_x) > 0.01 || Math.abs(inst.speed_y) > 0.01) {
				return true;
			}
		}
	}
	return false;
}

function create_ball(x, y, number) {
	const ball = instance_create("obj_ball", x, y);
	if (number === 0) {
		ball.sprite = "spr_ball_white";
	}
	ball.ball_number = number;
	ball.image_index = number;
	return ball;
}

create_object({
	id: "obj_frame",
	sprite: "spr_wood",
});

// ROOM
create_room({
	id: "rm_game",
	width: config.viewport_width / config.scale,
	height: config.viewport_height / config.scale,
	fps: 60,
	bg_color: "#076324", // Pool table green
	setup() {
		// Create white ball
		const white_ball = create_ball(80, 120, 0);
		instance_save("white_ball", white_ball);

		// Create rack of balls in triangle formation
		let row = 0;
		let col = 0;
		let x = 200;
		let y = 120;

		// Standard 8-ball rack arrangement
		const rack_order = [1, 2, 3, 4, 5, 10, 7, 8, 9, 6];
		let ball_index = 0;

		for (let row = 0; row < 5; row++) {
			for (let col = 0; col <= row; col++) {
				if (ball_index < rack_order.length) {
					const ball_x = x + row * 17 * Math.cos(Math.PI / 6);
					const ball_y = y + (col * 17 - (row * 17 * Math.sin(Math.PI / 6)) / 2);
					create_ball(ball_x, ball_y, rack_order[ball_index]);
					ball_index++;
				}
			}
		}

		// Create cue
		return [{ id: "obj_frame", z: -1 }, { id: "obj_cue" }];
	},
	camera: {
		x: 0,
		y: 0,
		width: config.viewport_width / config.scale,
		height: config.viewport_height / config.scale,
		viewport_width: config.viewport_width,
		viewport_height: config.viewport_height,
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
