// SPRITES
create_sprite({
	id: "spr_balls",
	filepath: "assets/balls.png",
	frames: 6,
	frame_width: 24,
	frame_height: 24,
	origin_x: 12,
	origin_y: 12,
});

create_sprite({
	id: "spr_player",
	filepath: "assets/player.png",
	frames: 4,
	frame_width: 70,
	frame_height: 60,
	origin_x: 35,
	origin_y: 30,
});

create_sprite({
	id: "spr_buckets",
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
	sprite: "spr_balls",
	collision_mask: { type: "circle", geom: [12] },
	create(self) {
		self.dx = Math.random() * 2 - 1;
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

				if (self.x < 12 || self.x > 308) {
					self.dx *= -1;
				}
			}

			if (self.y >= 180) {
				const buckets = objects_colliding(self, "obj_bucket");
				if (buckets.length > 0) {
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

create_object({
	id: "obj_player",
	sprite: "spr_player",
	collision_mask: { type: "rect", geom: [-35, -30, 70, 60] },
	create(self) {
		self.x = Math.random() * 220 + 50;
		self.y = 129;
		self.z = 1;
		self.speed = 3;
		self.image_speed = 0;
		self.facing_right = true;
		self.transition_timer = 0;
		self.transition_duration = 6;

		instance_create("obj_player_hands", self.x, self.y);
		instance_ref("player", self);
	},
	step(dt, self) {
		if (gm.keydown.f || gm.keydown.F) {
			self.speed *= 2;
		}

		if (self.transition_timer <= 0) {
			if (gm.keydown.ArrowLeft) {
				self.x -= self.speed;
				if (self.facing_right) {
					self.transition_timer = self.transition_duration;
					self.facing_right = false;
				}
			} else if (gm.keydown.ArrowRight) {
				self.x += self.speed;
				if (!self.facing_right) {
					self.transition_timer = self.transition_duration;
					self.facing_right = true;
				}
			}
		}

		self.x = Math.max(35, Math.min(285, self.x));

		if (self.transition_timer > 0) {
			self.image_index = 1;
			self.transition_timer--;
			self.speed = 1;
		} else {
			self.image_index = self.facing_right ? 0 : 2;
			self.speed = 3;
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
				player.z = 0;
				self.x = player.x;
			} else if (player.facing_right) {
				player.z = 1;
				self.x = player.x + 25;
			} else {
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

		if (gm.keydown.ArrowDown && self.held_ball) {
			self.held_ball.held = false;
			self.held_ball.dropped = true;
			self.held_ball.dy = 1;
			self.held_ball = null;
		}
	},
});

create_object({
	id: "obj_bucket",
	sprite: "spr_buckets",
	collision_mask: { type: "rect", geom: [-26, -30, 53, 60] },
	create(self) {
		self.y = 180;
		self.z = 180;
		self.image_speed = 0;
	},
	step(dt, self) {
		self.image_index = self.color || 0;
	},
});

create_object({
	id: "obj_controller",
	create(self) {
		self.spawn_timer = 0;
		self.spawn_interval = 100;
	},
	step(dt, self) {
		const room = room_current();

		if (!room.game_over) {
			self.spawn_timer++;
			if (self.spawn_timer >= self.spawn_interval) {
				const ball = instance_create("obj_ball", Math.random() * 280 + 20, -12);
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

create_room({
	id: "rm_game",
	width: 320,
	height: 240,
	screen: {
		width: 320,
		height: 240,
		final_width: 640,
		final_height: 480,
	},
	fps: 60,
	bg_color: "#808080",
	setup() {
		const room = room_current();
		room.score = 0;
		room.game_over = false;

		instance_create("obj_player");
		instance_create("obj_controller");

		const available_colors = [0, 1, 2, 3, 4, 5];
		for (let i = 0; i < 6; i++) {
			const color_index = Math.floor(Math.random() * available_colors.length);
			const color = available_colors[color_index];
			available_colors.splice(color_index, 1);

			const bucket = instance_create("obj_bucket", 26 + i * 53);
			bucket.color = color;
		}

		return [];
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
