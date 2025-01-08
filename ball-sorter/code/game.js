// SPRITES
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

// OBJECTS
create_object({
	id: "obj_ball",
	sprite: "balls",
	collision_mask: { type: "circle", geom: [12] },
	create(self) {
		self.dx = Math.random() * 2 - 1; // Random direction
		self.dy = 1;
		self.speed = 3;
		self.color = Math.floor(Math.random() * 6);
		self.image_index = self.color;
		self.held = false;
		self.dropped = false;
		self.image_speed = 0;
	},
	step(dt, self) {
		if (!self.held) {
			self.y += self.dy * self.speed;

			if (!self.dropped) {
				self.x += self.dx * self.speed;

				// Bounce off walls
				if (self.x < 12 || self.x > 308) {
					self.dx *= -1;
				}
			}

			// Check bucket collisions with proper y-position check
			if (self.y >= 180) {
				// Only check when near buckets
				const buckets = objects_colliding(self, "obj_bucket");

				if (buckets && buckets.length > 0) {
					const bucket = buckets[0];
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

// PLAYER

create_object({
	id: "obj_player",
	sprite: "player",
	collision_mask: { type: "rect", geom: [-35, -30, 70, 60] },
	create(self) {
		self.x = Math.random() * 220 + 50;
		self.y = 129;
		self.z = 1;
		self.speed = 3;
		self.image_speed = 0;
		self.facing_right = true;
		self.transition_timer = 0;
		self.transition_duration = 6; // Adjust this value to control how long the front-facing frame is shown

		// Create the hands
		const hands = instance_create("obj_player_hands", self.x, self.y);
		instance_ref("player", self);
	},
	step(dt, self) {
		const room = room_current();
		// Movement
		if (gm.keys_pressed.f || gm.keys_pressed.F) self.speed *= 2;

		let moving_left = gm.keys_pressed.ArrowLeft;
		let moving_right = gm.keys_pressed.ArrowRight;

		if (self.transition_timer <= 0) {
			if (moving_left) {
				self.x -= self.speed;
				if (self.facing_right) {
					self.transition_timer = self.transition_duration;
					self.facing_right = false;
				}
			} else if (moving_right) {
				self.x += self.speed;
				if (!self.facing_right) {
					self.transition_timer = self.transition_duration;
					self.facing_right = true;
				}
			}
		}

		// Keep in bounds
		self.x = Math.max(35, Math.min(285, self.x));

		// Update sprite
		if (self.transition_timer > 0) {
			self.image_index = 1; // Front-facing frame
			self.transition_timer--;
			self.speed = 1; // Slow down while transitioning
		} else {
			self.image_index = self.facing_right ? 0 : 2; // Right-facing or left-facing frame
			self.speed = 3; // Speed up when not transitioning
		}
	},
});
create_object({
	id: "obj_player_hands",
	collision_mask: { type: "rect", geom: [-10, -10, 20, 20] },
	create(self) {
		self.held_ball = null;
	},
	step(dt, self) {
		const player = instance_ref("player");
		if (player) {
			if (player.transition_timer > 0) {
				// During transition, place hands at the center
				player.z = 0;
				self.x = player.x;
			} else if (player.facing_right) {
				// Facing right
				player.z = 1;
				self.x = player.x + 25;
			} else {
				// Facing left
				player.z = 1;
				self.x = player.x - 25;
			}
			self.y = player.y - 6;
		}

		if (self.held_ball) {
			self.held_ball.x = self.x;
			self.held_ball.y = self.y;
		} else {
			const colliding_balls = objects_colliding(self, "obj_ball");
			if (colliding_balls.length > 0 && !colliding_balls[0].dropped) {
				self.held_ball = colliding_balls[0];
				self.held_ball.held = true;
			}
		}

		// Release the ball when Space is pressed
		if (gm.keys_pressed.ArrowDown && self.held_ball) {
			self.held_ball.held = false;
			self.held_ball.dropped = true;
			self.held_ball.dy = 1; // Reset vertical speed
			self.held_ball = null;
		}
	},
});

create_object({
	id: "obj_bucket",
	sprite: "buckets",
	collision_mask: { type: "rect", geom: [-26, -30, 53, 60] },
	create(self) {
		self.y = 180;
		self.z = 180;
		self.image_speed = 0;
	},
	step(dt, self) {
		self.image_index = self.color ? self.color : 0;
	},
});

// GAME CONTROLLER

create_object({
	id: "obj_game_controller",
	create(self) {
		self.spawn_timer = 0;
		self.spawn_interval = 100;
	},
	step(dt, self) {
		const room = room_current();

		// Ball spawning
		if (!room.game_over) {
			self.spawn_timer++;
			if (self.spawn_timer >= self.spawn_interval) {
				const ball = instance_create("obj_ball");
				ball.x = Math.random() * 280 + 20;
				ball.y = -12 + 12;
				self.spawn_timer = 0;
			}
		} else {
			room_restart();
		}
	},
	draw(self) {
		const room = room_current();
		gm.ctx.fillStyle = "black";
		gm.ctx.font = "12px Arial";
		gm.ctx.fillText(`Score: ${room.score}`, 10, 30);
	},
});

// Create room
create_room({
	id: "rm_game",
	width: 320,
	height: 240,
	camera: {
		x: 0,
		y: 0,
		width: 320,
		height: 240,
		get viewport_width() {
			const widthRatio = window.innerWidth / 320;
			const heightRatio = window.innerHeight / 240;
			const scale = Math.min(widthRatio, heightRatio);
			return Math.floor(320 * scale);
		},
		get viewport_height() {
			const widthRatio = window.innerWidth / 320;
			const heightRatio = window.innerHeight / 240;
			const scale = Math.min(widthRatio, heightRatio);
			return Math.floor(240 * scale);
		},
		// follow: "obj_player", // Uncomment to follow object
	},
	fps: 60,
	bg_color: "#808080",
	setup() {
		const room = room_current();
		room.score = 0;
		room.game_over = false;
		instance_create("obj_player");
		instance_create("obj_game_controller");

		// Create an array of available colors
		const availableColors = [0, 1, 2, 3, 4, 5];

		// Create buckets with evenly spaced x positions and unique colors
		Array.from({ length: 6 }, (_, index) => {
			// Randomly select a color from the available colors
			const colorIndex = Math.floor(Math.random() * availableColors.length);
			const color = availableColors[colorIndex];
			// Remove the selected color from the available colors
			availableColors.splice(colorIndex, 1);

			const bucket = instance_create("obj_bucket", 26 + index * 53, 0);
			bucket.color = color;
		});
	},
});

// Start the game
run_game(() => {
	room_goto("rm_game");
});
