// CONFIG
const config = {
	viewport_width: 384,
	viewport_height: 432,
	scale: 2,
};

// SPRITES
create_sprite({
	id: "spr_goku",
	filepath: "assets/goku.png",
	frames: 6,
	frame_width: 18,
	frame_height: 24,
	origin_x: 9,
	origin_y: 12,
});

create_sprite({
	id: "spr_goku_air",
	filepath: "assets/goku_air.png",
	frames: 2,
	frame_width: 20,
	frame_height: 24,
	origin_x: 10,
	origin_y: 12,
});

create_sprite({
	id: "spr_block",
	filepath: "assets/block.png",
	frames: 1,
	frame_width: 24,
	frame_height: 24,
	origin_x: 0,
	origin_y: 0,
});

// OBJECTS
create_object({
	id: "obj_goku",
	sprite: "spr_goku",
	collision_mask: { type: "rect", geom: [-9, -11, 18, 22] },
	create(self) {
		self.gravity = 0.5;
		self.jump_force = -7;
		self.vertical_speed = 0;
		self.can_flap = true;
		self.rotation = 0;
		self.on_ground = false;
		instance_save("player", self);
		self.controller = instance_get("controller");
	},
	step(dt, self) {
		if (!self.controller.game_over) {
			// Apply gravity
			if (!self.on_ground) {
				self.vertical_speed += self.gravity;
				self.image_speed = 0;
				if (self.sprite !== "spr_goku_air") self.sprite = "spr_goku_air";
				self.image_index = self.vertical_speed > 1.5 ? 1 : 0;
			} else {
				if (self.sprite !== "spr_goku") self.sprite = "spr_goku";
				self.image_speed = 3;
			}

			// Jump when space is pressed
			if ((gm.keys_pressed.Space || gm.keys_pressed["8"]) && (self.on_ground || self.can_flap)) {
				self.vertical_speed = self.jump_force;
				self.can_flap = false;
				self.on_ground = false;
			}
			if (!(gm.keys_pressed.Space || gm.keys_pressed["8"])) {
				self.can_flap = true;
			}

			// Update position
			self.y += self.vertical_speed;

			// Ground collision check
			if (self.y >= 204) {
				self.y = 204;
				self.on_ground = true;
				self.vertical_speed = 0;
			} else {
				self.on_ground = false;
			}

			// Check collisions with blocks
			const blocks = objects_colliding(self, "obj_block");
			if (blocks.length > 0) {
				self.controller.game_over = true;
			}
		} else {
			// Falls when game over
			self.vertical_speed += self.gravity;
			self.y += self.vertical_speed;
			self.image_speed = 0;
		}
	},
});

create_object({
	id: "obj_block",
	sprite: "spr_block",
	collision_mask: { type: "rect", geom: [0, 0, 24, 24] },
	create(self) {
		self.speed = 3;
		self.controller = instance_get("controller");
		self.score_added = false;
	},
	step(dt, self) {
		if (!self.controller.game_over) {
			// Move block left
			self.x -= self.speed;

			// Remove block when it's off screen
			if (self.x < -60) {
				instance_destroy(self);
			}

			// Add score when block passes goku
			const goku = instance_get("player");
			if (goku && goku.x > self.x + 12 && !self.score_added) {
				self.controller.score++;
				self.score_added = true;
			}
		}
	},
});

create_object({
	id: "obj_game_controller",
	create(self) {
		self.spawn_timer = 0;
		self.max_spawn_interval = 110;
		self.min_spawn_interval = 30;
		self.spawn_interval =
			Math.floor(Math.random() * (self.max_spawn_interval - self.min_spawn_interval + 1)) + self.min_spawn_interval;
		self.score = 0;
		self.game_over = false;
		self.game_over_timer = 0;
		instance_save("controller", self);
		self.controller = instance_get("controller");
	},
	step(dt, self) {
		const room = room_current();

		if (!self.controller.game_over) {
			self.spawn_timer++;
			if (self.spawn_timer >= self.spawn_interval) {
				// Adjust gap position based on viewport height
				const gap_position = Math.random() * (config.viewport_height / config.scale - 120) + 60; // Adjusted range
				const gap_size = 4;

				// Create column of blocks
				const max_blocks = Math.ceil(config.viewport_height / (24 * config.scale));
				for (let i = 0; i < max_blocks; i++) {
					// Top column
					if (i < gap_position / 24 - gap_size) {
						const block = instance_create("obj_block", config.viewport_width / config.scale, i * 24);
						block.group_id = self.spawn_timer;
					}
				}

				for (let i = Math.ceil(gap_position / 24) + 1; i < max_blocks; i++) {
					// Bottom column
					const block = instance_create("obj_block", config.viewport_width / config.scale, i * 24);
					block.group_id = self.spawn_timer;
				}

				self.spawn_timer = 0;
				self.spawn_interval =
					Math.floor(Math.random() * (self.max_spawn_interval - self.min_spawn_interval + 1)) +
					self.min_spawn_interval;
			}
		} else {
			self.game_over_timer += 3 / 60;

			if (self.game_over_timer >= 1 && (gm.keys_pressed.Space || gm.keys_pressed["8"])) {
				room_restart();
			}
		}
	},
	draw(self) {
		// Draw score - adjusted position based on viewport
		gm.ctx.fillStyle = "white";
		gm.ctx.font = "24px Arial";
		gm.ctx.fillText(`分数: ${self.controller.score}`, 10, 30);
		// gm.ctx.fillText(`分数: ${window.innerWidth} ${window.innerHeight}`, 10, 30);

		// Draw game over message - centered based on viewport
		if (self.game_over) {
			gm.ctx.fillStyle = "white";
			gm.ctx.font = "32px Arial";
			gm.ctx.fillText(
				"游戏结束!",
				config.viewport_width / (2 * config.scale) - 72,
				config.viewport_height / (2 * config.scale) - 30,
			);

			if (self.game_over_timer >= 3) {
				gm.ctx.font = "16px Arial";
				gm.ctx.fillText(
					"按空格键重新开始",
					config.viewport_width / (2 * config.scale) - 60,
					config.viewport_height / (2 * config.scale),
				);
			}
		}
	},
});

// Create room
create_room({
	id: "rm_game",
	width: config.viewport_width / config.scale,
	height: config.viewport_height / config.scale,
	camera: {
		x: 0,
		y: 0,
		width: config.viewport_width / config.scale,
		height: config.viewport_height / config.scale,
		viewport_width: config.viewport_width,
		viewport_height: config.viewport_height,
		// get viewport_width() {
		// 	const width_ratio = window.innerWidth / config.viewport_width;
		// 	const height_ratio = window.innerHeight / config.viewport_height;
		// 	const scale = Math.min(width_ratio, height_ratio);
		// 	return Math.floor(config.viewport_width * scale);
		// },
		// get viewport_height() {
		// 	const width_ratio = window.innerWidth / config.viewport_width;
		// 	const height_ratio = window.innerHeight / config.viewport_height;
		// 	const scale = Math.min(width_ratio, height_ratio);
		// 	return Math.floor(config.viewport_height * scale);
		// },
	},
	fps: 60,
	bg_color: "#555555",
	setup() {
		return [
			{
				id: "obj_game_controller",
				z: 1000,
			},
			{
				id: "obj_goku",
				x: config.viewport_width / (4 * config.scale),
				y: config.viewport_height / config.scale / 2,
			},
		];
	},
});

// Start the game
run_game(() => {
	room_goto("rm_game");
});
