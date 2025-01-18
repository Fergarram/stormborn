// OBJECTS
create_object({
	id: "obj_block",
	create(self, props) {
		self.speed = 3;
		self.score_added = false;
		self.controller = instance_ref("controller");
		self.parts = [];
		let top_column_height = 0;
		let bottom_column_height = 0;

		const { top_parts, bottom_parts } = props;

		for (let i = 0; i < top_parts; i++) {
			const part = instance_create("obj_column_part", self.x, self.y);
			top_column_height += part.image_height;

			part.y = self.y + top_column_height - part.image_height;
			self.parts.push(part);

			if (i === top_parts - 1) {
				const bottom_cap = instance_create("obj_column_part", self.x, self.y + top_column_height);
				bottom_cap.sprite = "spr_bottom";
				bottom_cap.image_width = 26;
				bottom_cap.image_height = 12;
				bottom_cap.collision_mask = {
					type: "rect",
					geom: [-13, 0, 26, 12],
				};
				bottom_cap.z = 100;
				self.parts.push(bottom_cap);
			}
		}

		for (let i = 0; i < bottom_parts; i++) {
			const part = instance_create("obj_column_part", self.x, self.y);
			bottom_column_height += part.image_height;

			part.y = self.y - bottom_column_height;
			self.parts.push(part);

			if (i === bottom_parts - 1) {
				const top_cap = instance_create("obj_column_part", self.x, self.y - bottom_column_height - 12);
				top_cap.sprite = "spr_top";
				top_cap.image_width = 26;
				top_cap.image_height = 12;
				top_cap.collision_mask = {
					type: "rect",
					geom: [-13, 0, 26, 12],
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
				self.parts.forEach((part) => {
					instance_destroy(part);
				});
			}

			const player = instance_ref("player");
			if (player && player.x > self.x + self.image_width / 2 && !self.score_added) {
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
		const column_sprites = {
			spr_c0: { w: 14, h: 12 },
			spr_c1: { w: 16, h: 4 },
			spr_c2: { w: 12, h: 10 },
			spr_c3: { w: 18, h: 8 },
			spr_c4: { w: 14, h: 6 },
			spr_c5: { w: 12, h: 16 },
		};

		const sprite_names = Object.keys(column_sprites);
		const part_number = Math.floor(Math.random() * sprite_names.length);
		self.sprite = sprite_names[part_number];

		const size = column_sprites[self.sprite];
		self.image_width = size.w;
		self.image_height = size.h;
		self.collision_mask = {
			type: "rect",
			geom: [-size.w / 2, -size.h / 2, size.w, size.h],
		};
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
		instance_ref("controller", self);
	},
	step(dt, self) {
		if (!self.game_over) {
			self.spawn_timer++;
			if (self.spawn_timer >= self.spawn_interval) {
				const x = VIEWPORT_WIDTH / SCALE;
				const screen_height = VIEWPORT_HEIGHT / SCALE;
				const column_placement = Math.floor(Math.random() * 3);
				const max_cols = 25;

				switch (column_placement) {
					case 0: {
						const top_parts = Math.floor((Math.random() * max_cols) / 2) + 1;
						const bottom_parts = Math.floor((Math.random() * max_cols) / 2) + 1;
						instance_create("obj_block", x, 0, 0, { top_parts, bottom_parts });
						instance_create("obj_block", x, screen_height - 20, 0, { top_parts, bottom_parts });
						break;
					}
					case 1: {
						const top_parts = Math.floor(Math.random() * max_cols) + 1;
						instance_create("obj_block", x, 0, 0, { top_parts, bottom_parts: 0 });
						break;
					}
					case 2: {
						const bottom_parts = Math.floor((Math.random() * max_cols) / 2) + 1;
						instance_create("obj_block", x, screen_height - 20, 0, { top_parts: 0, bottom_parts });
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
		gm.ctx.fillStyle = "#000000";
		gm.ctx.font = "24px Times New Roman";
		gm.ctx.fillText(`分数: ${self.score}`, 10, 30);

		if (self.game_over) {
			gm.ctx.fillStyle = "#000000";
			gm.ctx.font = "32px Times New Roman";
			gm.ctx.fillText("游戏结束!", VIEWPORT_WIDTH / (2 * SCALE) - 72, VIEWPORT_HEIGHT / (2 * SCALE) - 30);

			if (self.game_over_timer >= 3) {
				gm.ctx.font = "16px Times New Roman";
				gm.ctx.fillText("按空格键重新开始", VIEWPORT_WIDTH / (2 * SCALE) - 60, VIEWPORT_HEIGHT / (2 * SCALE));
			}
		}
	},
});

create_room({
	id: "rm_game",
	width: VIEWPORT_WIDTH,
	height: VIEWPORT_HEIGHT,
	screen: {
		width: VIEWPORT_WIDTH,
		height: VIEWPORT_HEIGHT,
		final_width: VIEWPORT_WIDTH * SCALE,
		final_height: VIEWPORT_HEIGHT * SCALE,
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
				x: VIEWPORT_WIDTH / (4 * SCALE),
				y: VIEWPORT_HEIGHT / SCALE / 2,
			},
			{
				id: "obj_background",
				z: -1000,
			},
			{
				id: "obj_floor",
				y: VIEWPORT_HEIGHT / SCALE - 20,
				z: -500,
			},
			{
				id: "obj_clouds",
			},
		];
	},
});

// Start the game
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
