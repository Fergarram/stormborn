// OBJECTS
create_object({
	id: "obj_ctrl",
	create(self) {
		self.balls_remaining = 10; // Total non-white balls
		self.black_ball_destroyed = false;
		instance_save("obj_ctrl", self);
	},
});

create_object({
	id: "obj_ball",
	sprite: "spr_balls",
	collision_mask: { type: "circle", geom: [8] },
	create(self) {
		self.speed_x = 0;
		self.speed_y = 0;
		self.ball_number = 0;
		self.image_speed = 0;
		self.acc_x = 0;
		self.acc_y = 0;

		// Smoothness control parameters
		self.friction = 0.98;
		self.movement_threshold = 0.5; // How many pixels to accumulate before moving (lower = more frequent updates)
		self.min_speed = 0.01; // Minimum speed before stopping completely
		self.bounce_factor = 0.8; // How bouncy the balls are against walls (0-1)
		self.collision_elasticity = 0.95; // How elastic ball-to-ball collisions are (0-1)
	},
	step(dt, self) {
		const wall_size = 23;

		// Accumulate sub-pixel movement
		self.acc_x += self.speed_x;
		self.acc_y += self.speed_y;

		// Only move when accumulated movement reaches threshold
		if (Math.abs(self.acc_x) >= self.movement_threshold) {
			self.x += Math.floor(self.acc_x);
			self.acc_x -= Math.floor(self.acc_x);
		}
		if (Math.abs(self.acc_y) >= self.movement_threshold) {
			self.y += Math.floor(self.acc_y);
			self.acc_y -= Math.floor(self.acc_y);
		}

		// Apply friction
		self.speed_x *= self.friction;
		self.speed_y *= self.friction;

		// Stop if speed is very low
		if (Math.abs(self.speed_x) < self.min_speed) self.speed_x = 0;
		if (Math.abs(self.speed_y) < self.min_speed) self.speed_y = 0;

		// Bounce off walls
		if (self.x < wall_size || self.x > config.viewport_width / config.scale - wall_size) {
			self.speed_x *= -self.bounce_factor;
			self.acc_x = 0;
			self.x = Math.min(Math.max(self.x, wall_size), config.viewport_width / config.scale - wall_size);
		}
		if (self.y < wall_size || self.y > config.viewport_height / config.scale - wall_size) {
			self.speed_y *= -self.bounce_factor;
			self.acc_y = 0;
			self.y = Math.min(Math.max(self.y, wall_size), config.viewport_height / config.scale - wall_size);
		}

		// Ball collision
		const other_balls = objects_colliding(self, "obj_ball");
		for (const other of other_balls) {
			if (other.id === self.id) continue;

			const dx = other.x - self.x;
			const dy = other.y - self.y;
			const dist = point_distance(self.x, self.y, other.x, other.y);

			if (dist < 16) {
				const angle = Math.atan2(dy, dx);
				const overlap = 16 - dist;

				const move_x = Math.floor((Math.cos(angle) * overlap) / 2);
				const move_y = Math.floor((Math.sin(angle) * overlap) / 2);

				self.x -= move_x;
				self.y -= move_y;
				other.x += move_x;
				other.y += move_y;

				self.acc_x = 0;
				self.acc_y = 0;
				other.acc_x = 0;
				other.acc_y = 0;

				const nx = dx / dist;
				const ny = dy / dist;
				const dvx = other.speed_x - self.speed_x;
				const dvy = other.speed_y - self.speed_y;
				const impulse = (dvx * nx + dvy * ny) * self.collision_elasticity;

				self.speed_x += impulse * nx;
				self.speed_y += impulse * ny;
				other.speed_x -= impulse * nx;
				other.speed_y -= impulse * ny;
			}
		}
	},
});

create_object({
	id: "obj_hole",
	collision_mask: { type: "circle", geom: [6] },
	create(self) {
		self.controller = instance_get("obj_ctrl");
	},
	step(dt, self) {
		const balls = objects_colliding(self, "obj_ball");

		for (const ball of balls) {
			// Check if it's the white ball
			if (ball.ball_number === 0) {
				room_restart();
				return;
			}

			// Decrease remaining balls count
			if (ball.ball_number !== 0) {
				// Don't count white ball
				self.controller.balls_remaining--;
			}

			instance_destroy(ball);
		}
	},
});

create_object({
	id: "obj_cue",
	create(self) {
		self.power = 0;
		self.max_power = 15;
		self.pulling = false;
		self.rotation_speed = 3; // Degrees per step when rotating
		self.target_angle = 0;
		self.cue_length = 200; // Fixed cue length in pixels
	},
	step(dt, self) {
		const white_ball = instance_get("white_ball");
		if (!white_ball) return;

		if (!is_any_ball_moving()) {
			// Position at white ball
			self.x = white_ball.x;
			self.y = white_ball.y;

			// Rotate with 4 and 6 buttons
			if (gm.keys_pressed["4"] || gm.keys_pressed["ArrowLeft"]) {
				self.target_angle -= self.rotation_speed;
			}
			if (gm.keys_pressed["6"] || gm.keys_pressed["ArrowRight"]) {
				self.target_angle += self.rotation_speed;
			}

			self.image_angle = self.target_angle;

			// Handle shooting with button 5
			if (gm.keys_pressed["5"] || gm.keys_pressed["ArrowUp"] || gm.keys_pressed["ArrowDown"]) {
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
		if (!is_any_ball_moving()) {
			const ctx = gm.ctx;
			const white_ball = instance_get("white_ball");
			if (!white_ball) return;

			// Calculate the angle in radians
			const rad_angle = (self.image_angle * Math.PI) / 180;

			// Calculate direction vector
			const dx = Math.cos(rad_angle);
			const dy = Math.sin(rad_angle);

			// Calculate cue start and end points
			const back_offset = self.pulling ? 20 + self.power * 2 : 20;
			const start_x = white_ball.x - dx * back_offset;
			const start_y = white_ball.y - dy * back_offset;
			const end_x = start_x - dx * self.cue_length; // Use fixed length
			const end_y = start_y - dy * self.cue_length; // Use fixed length

			// Draw the cue
			ctx.beginPath();
			ctx.moveTo(start_x, start_y);
			ctx.lineTo(end_x, end_y);
			ctx.strokeStyle = self.pulling ? "rgba(255, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.5)";
			ctx.lineWidth = 2;
			ctx.stroke();

			// Draw the power meter if pulling
			if (self.pulling) {
				ctx.fillStyle = "red";
				ctx.fillRect(10, 10, (self.power / self.max_power) * 100, 10);
			}
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
		// Create controller
		instance_create("obj_ctrl", 0, 0);

		// Create white ball
		const white_ball = create_ball(80, 120, 0);
		instance_save("white_ball", white_ball);

		// Create rack of balls in triangle formation
		let row = 0;
		let col = 0;
		let x = 200;
		let y = 115;

		// Standard 8-ball rack arrangement
		const rack_order = [1, 2, 3, 4, 5, 10, 7, 8, 9, 6];
		let ball_index = 0;

		for (let row = 0; row < 5; row++) {
			for (let col = 0; col <= row; col++) {
				if (ball_index < rack_order.length) {
					const ball_x = Math.round(x + row * 17 * Math.cos(Math.PI / 6));
					const ball_y = Math.round(y + (col * 17 - (row * 17 * Math.sin(Math.PI / 6)) / 2));
					create_ball(ball_x, ball_y, rack_order[ball_index]);
					ball_index++;
				}
			}
		}

		// Calculate hole positions
		const wall_inset = 12;
		const table_width = config.viewport_width / config.scale;
		const table_height = config.viewport_height / config.scale;

		// Create corner and middle pocket holes
		const hole_positions = [
			// Top left
			{ x: wall_inset + 3, y: wall_inset + 3 },
			// Top middle
			{ x: table_width / 2, y: wall_inset },
			// Top right
			{ x: table_width - wall_inset - 3, y: wall_inset + 3 },
			// Bottom left
			{ x: wall_inset + 3, y: table_height - wall_inset - 3 },
			// Bottom middle
			{ x: table_width / 2, y: table_height - wall_inset },
			// Bottom right
			{ x: table_width - wall_inset - 3, y: table_height - wall_inset - 3 },
		];

		// Create the holes
		for (const pos of hole_positions) {
			instance_create("obj_hole", pos.x, pos.y);
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
