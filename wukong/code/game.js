// OBJECTS
create_object({
	id: "obj_block",
	create(self, { top_parts, bottom_parts }) {
		self.speed = 3;
		self.score_added = false;
		self.controller = instance_ref("controller");
		self.parts = [];
		let top_column_height = 0;
		let bottom_column_height = 0;

		for (let i = 0; i < top_parts; i++) {
			const part = instance_create("obj_column_part", self.x, self.y);
			top_column_height += part.height;

			part.y = self.y + top_column_height - part.height;
			self.parts.push(part);

			if (i === top_parts - 1) {
				const bottom_cap = instance_create("obj_column_part", self.x, self.y + top_column_height);
				bottom_cap.sprite = "spr_bottom";
				bottom_cap.width = 26;
				bottom_cap.height = 12;
				bottom_cap.collision_mask = {
					type: "rect",
					geom: [-bottom_cap.width / 2, 0, bottom_cap.width, bottom_cap.height],
				};
				bottom_cap.z = 100;
				self.parts.push(bottom_cap);
			}
		}

		for (let i = 0; i < bottom_parts; i++) {
			const part = instance_create("obj_column_part", self.x, self.y);
			bottom_column_height += part.height;

			part.y = self.y - bottom_column_height;
			self.parts.push(part);

			if (i === bottom_parts - 1) {
				const top_cap = instance_create("obj_column_part", self.x, self.y - bottom_column_height - 12);
				top_cap.sprite = "spr_top";
				top_cap.width = 26;
				top_cap.height = 12;
				top_cap.collision_mask = {
					type: "rect",
					geom: [-top_cap.width / 2, 0, top_cap.width, top_cap.height],
				};
				top_cap.z = 100;
				self.parts.push(top_cap);
			}
		}
	},
	step(dt, self) {
		if (!self.controller.game_over) {
			self.x -= self.speed;

			if (self.x < -60) {
				instance_destroy(self);

				// Remove parts
				self.parts.forEach((part) => {
					instance_destroy(part);
				});
			}

			const goku = instance_ref("player");
			if (goku && goku.x > self.x + self.image_width / 2 && !self.score_added) {
				self.controller.score++;
				self.score_added = true;
			}
		}

		self.parts.forEach((part) => {
			part.x = self.x;
		});
	},
});

create_object({
	id: "obj_column_part",
	create(self) {
		const column_spr_sizes = {
			spr_c0: { w: 14, h: 12 },
			spr_c1: { w: 16, h: 4 },
			spr_c2: { w: 12, h: 10 },
			spr_c3: { w: 18, h: 8 },
			spr_c4: { w: 14, h: 6 },
			spr_c5: { w: 12, h: 16 },
		};

		const column_spr_names = Object.keys(column_spr_sizes);

		const part_number = Math.floor(Math.random() * column_spr_names.length);
		self.sprite = column_spr_names[part_number];

		self.width = column_spr_sizes[self.sprite].w;
		self.height = column_spr_sizes[self.sprite].h;
		self.collision_mask = { type: "rect", geom: [-self.width / 2, -self.height / 2, self.width, self.height] };
	},
});

create_object({
	id: "obj_game_controller",
	create(self) {
		self.spawn_timer = 0;
		self.max_spawn_interval = 70;
		self.min_spawn_interval = 50;
		self.spawn_interval =
			Math.floor(Math.random() * (self.max_spawn_interval - self.min_spawn_interval + 1)) + self.min_spawn_interval;
		self.score = 0;
		self.game_over = false;
		self.game_over_timer = 0;
		instance_save("controller", self);
	},
	step(dt, self) {
		if (!self.game_over) {
			self.spawn_timer++;
			if (self.spawn_timer >= self.spawn_interval) {
				const x = config.viewport_width / config.scale;
				const screen_height = config.viewport_height / config.scale;
				const column_placement = Math.floor(Math.random() * 3);
				const max_cols = 25;

				switch (column_placement) {
					// Top and bottom
					case 0: {
						const top_parts = Math.floor((Math.random() * max_cols) / 2) + 1;
						const bottom_parts = Math.floor((Math.random() * max_cols) / 2) + 1;
						instance_create("obj_block", x, 0, 0, { top_parts, bottom_parts });
						instance_create("obj_block", x, screen_height - 20, 0, { top_parts, bottom_parts });
						break;
					}
					// Top
					case 1: {
						const top_parts = Math.floor(Math.random() * max_cols) + 1;
						const bottom_parts = 0;
						instance_create("obj_block", x, 0, 0, { top_parts, bottom_parts });
						break;
					}
					// Bottom
					case 2: {
						const top_parts = 0;
						const bottom_parts = Math.floor((Math.random() * max_cols) / 2) + 1;
						instance_create("obj_block", x, screen_height - 20, 0, { top_parts, bottom_parts });
						break;
					}
				}

				self.spawn_timer = 0;
				self.spawn_interval =
					Math.floor(Math.random() * (self.max_spawn_interval - self.min_spawn_interval + 1)) +
					self.min_spawn_interval;
			}
		} else {
			self.game_over_timer += 3 / 60;
		}
	},
	draw(self) {
		// Draw score - adjusted position based on viewport
		gm.ctx.fillStyle = "#000000";
		gm.ctx.font = "24px Times New Roman";
		gm.ctx.fillText(`分数: ${self.score}`, 10, 30);
		// gm.ctx.fillText(`分数: ${window.innerWidth} ${window.innerHeight}`, 10, 30);

		// Draw game over message - centered based on viewport
		if (self.game_over) {
			gm.ctx.fillStyle = "#000000";
			gm.ctx.font = "32px Times New Roman";
			gm.ctx.fillText(
				"游戏结束!",
				config.viewport_width / (2 * config.scale) - 72,
				config.viewport_height / (2 * config.scale) - 30,
			);

			if (self.game_over_timer >= 3) {
				gm.ctx.font = "16px Times New Roman";
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
			{
				id: "obj_background",
				z: -1000,
			},
			{
				id: "obj_floor",
				y: config.viewport_height / config.scale - 20,
				z: -500,
			},
			{ id: "obj_clouds", x: 0, y: 0 },
		];
	},
});

// Start the game
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
