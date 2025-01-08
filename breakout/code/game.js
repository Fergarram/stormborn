// SPRITES
create_sprite({
	id: "spr_paddle",
	filepath: "assets/paddle.png",
	frame_width: 48,
	frame_height: 12,
	origin_x: 24,
	origin_y: 6,
});

create_sprite({
	id: "spr_ball",
	filepath: "assets/ball.png",
	frame_width: 8,
	frame_height: 8,
	origin_x: 4,
	origin_y: 4,
});

create_sprite({
	id: "spr_brick",
	filepath: "assets/brick.png",
	frame_width: 32,
	frame_height: 16,
	origin_x: 0,
	origin_y: 0,
});

// OBJECTS
create_object({
	id: "obj_paddle",
	sprite: "spr_paddle",
	collision_mask: { type: "rect", geom: [-24, -6, 48, 12] },
	create(self) {
		self.speed = 5;
		instance_save("paddle", self);
	},
	step(dt, self) {
		// Move paddle with arrow keys
		if (gm.keys_pressed.ArrowLeft) {
			self.x = Math.max(24, self.x - self.speed);
		}
		if (gm.keys_pressed.ArrowRight) {
			self.x = Math.min(296, self.x + self.speed);
		}
	},
});

create_object({
	id: "obj_ball",
	sprite: "spr_ball",
	collision_mask: { type: "circle", geom: [4] },
	create(self) {
		self.speed = 4;
		// Random initial direction between -60 and -120 degrees
		self.direction = -90 + (Math.random() > 0.5 ? 30 : -30);
		self.stuck = true;
		self.controller = instance_ref("controller");
		instance_save("ball", self);
	},
	step(dt, self) {
		if (self.stuck) {
			const paddle = instance_ref("paddle");
			self.x = paddle.x;
			self.y = paddle.y - 12;

			if (gm.keys_pressed.Space || gm.keys_pressed.ArrowUp) {
				self.stuck = false;
			}
		} else {
			// Move ball
			const rad = (self.direction * Math.PI) / 180;
			self.x += Math.cos(rad) * self.speed;
			self.y += Math.sin(rad) * self.speed;

			// Bounce off walls
			if (self.x < 4 || self.x > 316) {
				self.direction = 180 - self.direction;
			}
			if (self.y < 4) {
				self.direction = -self.direction;
			}

			// Check if ball is below paddle
			if (self.y > 240) {
				self.controller.lives--;
				if (self.controller.lives > 0) {
					self.stuck = true;
				} else {
					self.controller.game_over = true;
				}
			}

			// Bounce off paddle
			const paddle = instance_ref("paddle");
			if (instances_colliding(self, paddle)) {
				// Calculate bounce angle based on where ball hits paddle
				// Map paddle hit position to angle between -60 and 60 degrees
				const diff = (self.x - paddle.x) / 24; // Normalize to -1 to 1
				self.direction = -90 + diff * 60; // Convert to angle
				self.y = paddle.y - 12;
			}

			// Check brick collisions
			const hit_bricks = objects_colliding(self, "obj_brick");
			if (hit_bricks.length > 0) {
				self.direction = -self.direction;
				instance_destroy(hit_bricks[0]);
				self.controller.score += 10;

				// Check if all bricks are destroyed
				if (instance_count("obj_brick") === 0) {
					self.controller.level_complete = true;
				}
			}
		}
	},
});

create_object({
	id: "obj_brick",
	sprite: "spr_brick",
	collision_mask: { type: "rect", geom: [0, 0, 32, 16] },
});

create_object({
	id: "obj_controller",
	create(self) {
		self.score = 0;
		self.lives = 3;
		self.game_over = false;
		self.level_complete = false;
		instance_save("controller", self);
	},
	step(dt, self) {
		if (self.game_over && (gm.keys_pressed.Space || gm.keys_pressed.ArrowUp)) {
			room_restart();
		}
		if (self.level_complete && (gm.keys_pressed.Space || gm.keys_pressed.ArrowUp)) {
			room_restart();
		}
	},
	draw(self) {
		gm.ctx.fillStyle = "white";
		gm.ctx.font = "14px Arial";
		gm.ctx.fillText(`Score: ${self.score}`, 10, 20);
		gm.ctx.fillText(`Lives: ${self.lives}`, 250, 20);

		if (self.game_over) {
			gm.ctx.font = "24px Arial";
			gm.ctx.fillText("Game Over!", 100, 120);
			gm.ctx.font = "14px Arial";
			gm.ctx.fillText("Press Space to restart", 90, 150);
		}

		if (self.level_complete) {
			gm.ctx.font = "24px Arial";
			gm.ctx.fillText("Level Complete!", 70, 120);
			gm.ctx.font = "14px Arial";
			gm.ctx.fillText("Press Space for next level", 80, 150);
		}
	},
});

// Create room
create_room({
	id: "rm_game",
	width: config.viewport_width,
	height: config.viewport_height,
	fps: 60,
	bg_color: "#000000",
	camera: {
		x: 0,
		y: 0,
		width: config.viewport_width / config.scale,
		height: config.viewport_height / config.scale,
		viewport_width: config.viewport_width,
		viewport_height: config.viewport_height,
	},
	setup() {
		return [
			{
				id: "obj_controller",
				z: 1,
			},
			{
				id: "obj_paddle",
				x: 160,
				y: 220,
			},
			{
				id: "obj_ball",
				x: 160,
				y: 208,
			},
			// Create brick layout
			...[...Array(6)].flatMap((_, row) =>
				[...Array(8)].map((_, col) => ({
					id: "obj_brick",
					x: 32 + col * 32,
					y: 40 + row * 16,
				})),
			),
		];
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
