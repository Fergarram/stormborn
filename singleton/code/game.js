// Create sprites
create_sprite({
	id: "balls",
	filepath: "assets/balls.png",
	frames: 6,
	frame_width: 24,
	frame_height: 24,
	origin_x: 12,
	origin_y: 12,
});

create_sprite({
	id: "player",
	filepath: "assets/player.png",
	frames: 4,
	frame_width: 70,
	frame_height: 60,
	origin_x: 35,
	origin_y: 30,
});

create_sprite({
	id: "buckets",
	filepath: "assets/buckets.png",
	frames: 6,
	frame_width: 53,
	frame_height: 60,
	origin_x: 26,
	origin_y: 30,
});

// Create game objects
create_object({
	id: "obj_ball",
	sprite: "balls",
	collision_mask: { type: "circle", geom: [12] },
	create: function (self) {
		self.dx = Math.random() * 2 - 1; // Random direction
		self.dy = 1;
		self.speed = 1;
		self.color = Math.floor(Math.random() * 6);
		self.image_index = self.color;
		self.held = false;
		self.image_speed = 0;
	},
	step: function (dt, self) {
		if (!self.held) {
			self.x += self.dx * self.speed;
			self.y += self.dy * self.speed;

			// Bounce off walls
			if (self.x < 12 || self.x > 308) {
				self.dx *= -1;
			}

			// Check bucket collisions with proper y-position check
			if (self.y >= 180) {
				// Only check when near buckets
				const buckets = objects_colliding(self, "obj_bucket");
				// console.log(buckets);
				if (buckets && buckets.length > 0) {
					const bucket = buckets[0];
					console.log(bucket);
					if (bucket.color === self.color) {
						instance_destroy(self);
						room_current().score++;
					} else {
						room_current().game_over = true;
					}
				}
			}
		}
	},
});

create_object({
	id: "obj_player",
	sprite: "player",
	collision_mask: { type: "rect", geom: [-35, -30, 70, 60] },
	create: function (self) {
		self.x = Math.random() * 220 + 50;
		self.y = 129;
		self.speed = 3;
		self.held_ball = null;
		self.image_speed = 0;
		self.facing_right = true;
	},
	step: function (dt, self) {
		const room = room_current();
		if (!room.game_over) {
			// Movement
			let move_speed = self.speed;
			if (gm.keys_pressed.F) move_speed *= 2;

			if (gm.keys_pressed.ArrowLeft) {
				self.x -= move_speed;
				self.facing_right = false;
			}
			if (gm.keys_pressed.ArrowRight) {
				self.x += move_speed;
				self.facing_right = true;
			}

			// Keep in bounds
			self.x = Math.max(35, Math.min(285, self.x));

			// Update sprite
			self.image_index = self.facing_right ? 0 : 1;

			// Ball handling with explicit collision check
			if (!self.held_ball) {
				const balls = objects_colliding(self, "obj_ball");
				if (balls && balls.length > 0) {
					const ball = balls[0];
					if (!ball.held) {
						// Only pick up balls that aren't already held
						self.held_ball = ball;
						self.held_ball.held = true;
					}
				}
			}

			if (self.held_ball) {
				self.held_ball.x = self.x + (self.facing_right ? 53 : 0);
				self.held_ball.y = self.y - 20;

				if (gm.keys_pressed.ArrowDown) {
					self.held_ball.held = false;
					self.held_ball = null;
				}
			}
		} else {
			// Game over state
			self.image_index = self.facing_right ? 2 : 3;
			if (self.held_ball) {
				self.held_ball.held = false;
				self.held_ball = null;
			}
		}
	},
});

create_object({
	id: "obj_bucket",
	sprite: "buckets",
	collision_mask: { type: "rect", geom: [-26, -30, 53, 60] },
	setup: function (obj_id) {
		// Static array to keep track of used colors
		if (!this.used_colors) {
			this.used_colors = new Set();
		}
	},
	create: function (self) {
		self.y = 180;
		self.image_speed = 0;

		// Get available colors (0-5)
		let available_colors = [];
		for (let i = 0; i < 6; i++) {
			if (!this.used_colors.has(i)) {
				available_colors.push(i);
			}
		}

		// Randomly select from remaining colors
		const random_index = Math.floor(Math.random() * available_colors.length);
		self.color = available_colors[random_index];
		self.image_index = self.color;

		// Add to used colors
		this.used_colors.add(self.color);

		// Reset used colors if all colors have been used
		if (this.used_colors.size === 6) {
			this.used_colors.clear();
		}
	},
});

create_object({
	id: "obj_game_controller",
	create: function (self) {
		self.spawn_timer = 0;
		self.spawn_interval = 160;
	},
	step: function (dt, self) {
		const room = room_current();

		// Ball spawning
		if (!room.game_over) {
			self.spawn_timer++;
			if (self.spawn_timer >= self.spawn_interval) {
				const ball = instance_create("obj_ball");
				ball.x = Math.random() * 280 + 20;
				ball.y = -12;
				self.spawn_timer = 0;
			}
		}

		// Check for restart
		if (instance_count("obj_ball") >= 32) {
			room_goto("rm_game");
		}
	},
	draw: function (self) {
		const room = room_current();
		gm.ctx.fillStyle = "white";
		gm.ctx.font = "20px Arial";
		gm.ctx.fillText(`Score: ${room.score}`, 10, 30);
	},
});

// Create room
create_room({
	id: "rm_game",
	width: 320,
	height: 240,
	fps: 60,
	bg_color: "#000000",
	setup: function () {
		const room = room_current();
		room.score = 0;
		room.game_over = false;

		room.camera = {
			x: 0,
			y: 0,
			width: 320,
			height: 240,
			viewport_width: 320,
			viewport_height: 240,
		};

		instance_create("obj_player");
		instance_create("obj_game_controller");

		// Create buckets with evenly spaced x positions
		return Array.from({ length: 6 }, (_, index) => ({
			id: "obj_bucket",
			x: 26 + index * 53,
		}));
	},
});

// Start the game
run_game(() => {
	room_goto("rm_game");
});
