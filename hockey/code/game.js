// SPRITES
create_sprite({
	id: "spr_field",
	filepath: "assets/field.png",
	frames: 1,
	frame_width: 320,
	frame_height: 576,
	origin_x: 0,
	origin_y: 0,
});

create_sprite({
	id: "spr_mallet,puck",
	filepath: "assets/mallets,puck.png",
	frames: 5,
	frame_width: 30,
	frame_height: 30,
	origin_x: 15,
	origin_y: 15,
});

// OBJECTS
create_object({
	id: "obj_field",
	sprite: "spr_field",
	create(self) {
		self.z = -1000; // Put in background
	},
});

create_object({
	id: "obj_mallet",
	sprite: "spr_mallet,puck",
	collision_mask: { type: "circle", geom: [15] },
	create(self, props) {
		self.player = props.player;
		self.image_speed = 0;
		self.image_index = props.player === 1 ? 0 : 2;
		self.touch_id = null;
		self.speed = 0.5;
		self.boundary = {
			min_y: props.player === 1 ? 288 : 0,
			max_y: props.player === 1 ? 576 : 288,
			min_x: 0,
			max_x: 320,
		};
		// Add target position properties
		self.target_x = self.x;
		self.target_y = self.y;
		self.move_speed = 15; // Adjust this value to change movement speed
	},
	step(dt, self) {
		// Smoothly move towards target position
		if (self.touch_id !== null) {
			const dx = self.target_x - self.x;
			const dy = self.target_y - self.y;

			// Move towards target position
			self.x += dx * ((self.move_speed * dt) / 1000);
			self.y += dy * ((self.move_speed * dt) / 1000);
		}

		// Constrain mallet position within boundaries
		self.x = Math.round(Math.max(self.boundary.min_x, Math.min(self.boundary.max_x, self.x)));
		self.y = Math.round(Math.max(self.boundary.min_y, Math.min(self.boundary.max_y, self.y)));
	},
});

create_object({
	id: "obj_puck",
	sprite: "spr_mallet,puck",
	collision_mask: { type: "circle", geom: [11] },
	create(self) {
		self.speed_x = 0;
		self.speed_y = 0;
		self.friction = 0.98;
		self.rebound = 0.8;
		self.image_speed = 0;
		self.image_index = 4;
		self.is_resetting = false; // Add flag for reset state

		// Boundaries accounting for puck radius
		self.wall_left = 28 + 11;
		self.wall_right = 320 - (28 + 11);
		self.wall_top = 28 + 11;
		self.wall_bottom = 576 - (28 + 11);

		// Add reset position method
		self.reset_position = async () => {
			self.is_resetting = true;
			await requeue(1000); // Wait 1 second
			self.x = 160;
			self.y = 288;
			self.speed_x = 0;
			self.speed_y = 0;
			self.is_resetting = false;
		};
	},
	step(dt, self) {
		// Apply movement
		self.x += self.speed_x;
		self.y += self.speed_y;

		// Apply friction
		self.speed_x *= self.friction;
		self.speed_y *= self.friction;

		// Handle collisions with mallets
		const hit_mallets = objects_colliding(self, "obj_mallet");
		if (hit_mallets.length > 0) {
			const mallet = hit_mallets[0];

			// Get angle and power from mallet hit
			const angle = point_direction(mallet.x, mallet.y, self.x, self.y);
			const power = 12;

			// Set new velocities
			self.speed_x = Math.cos((angle * Math.PI) / 180) * power;
			self.speed_y = Math.sin((angle * Math.PI) / 180) * power;

			// Push puck away from mallet slightly to prevent sticking
			self.x += self.speed_x * 0.5;
			self.y += self.speed_y * 0.5;
		}

		// Handle wall collisions
		if (self.x < self.wall_left) {
			self.x = self.wall_left;
			self.speed_x = Math.abs(self.speed_x) * self.rebound;
		}
		if (self.x > self.wall_right) {
			self.x = self.wall_right;
			self.speed_x = -Math.abs(self.speed_x) * self.rebound;
		}

		// Handle top/bottom walls and scoring
		if (!self.is_resetting && (self.y < self.wall_top || self.y > self.wall_bottom)) {
			// Check for goal collisions
			const goals = objects_colliding(self, "obj_goal");
			if (goals.length > 0 && !self.is_resetting) {
				const goal = goals[0];
				const controller = instance_ref("controller");
				if (goal.player === 1) {
					controller.score_p2++;
				} else {
					controller.score_p1++;
				}
				self.reset_position(); // This is now async
			} else {
				// Bounce off walls if not in goal
				if (self.y < self.wall_top) {
					self.y = self.wall_top;
					self.speed_y = Math.abs(self.speed_y) * self.rebound;
				}
				if (self.y > self.wall_bottom) {
					self.y = self.wall_bottom;
					self.speed_y = -Math.abs(self.speed_y) * self.rebound;
				}
			}
		}

		// Stop if moving very slowly
		if (Math.abs(self.speed_x) < 0.01) self.speed_x = 0;
		if (Math.abs(self.speed_y) < 0.01) self.speed_y = 0;

		// Round
		self.x = Math.round(self.x);
		self.y = Math.round(self.y);
	},
});

create_object({
	id: "obj_goal",
	collision_mask: { type: "rect", geom: [0, 0, 64, 10] }, // Adjustable width/height
	create(self, props) {
		self.player = props.player;
	},
});

create_object({
	id: "obj_game_controller",
	create(self) {
		self.score_p1 = 0;
		self.score_p2 = 0;
		instance_save("controller", self);

		// Handle touch events
		const canvas = gm.canvas;

		canvas.addEventListener("touchstart", (e) => {
			e.preventDefault();
			const rect = canvas.getBoundingClientRect();
			const scale_x = 320 / rect.width;
			const scale_y = 576 / rect.height;

			for (const touch of e.changedTouches) {
				const touch_x = (touch.clientX - rect.left) * scale_x;
				const touch_y = (touch.clientY - rect.top) * scale_y;

				// Find nearest mallet without a touch
				const mallets = Object.values(room_current().instances).filter(
					(inst) => inst.object_id === "obj_mallet" && inst.touch_id === null,
				);

				for (const mallet of mallets) {
					// Check if touch is in mallet's valid area
					if (touch_y >= mallet.boundary.min_y && touch_y <= mallet.boundary.max_y) {
						mallet.touch_id = touch.identifier;
						mallet.target_x = touch_x;
						mallet.target_y = touch_y;
						break;
					}
				}
			}
		});

		canvas.addEventListener("touchmove", (e) => {
			e.preventDefault();
			const rect = canvas.getBoundingClientRect();
			const scale_x = 320 / rect.width;
			const scale_y = 576 / rect.height;

			for (const touch of e.changedTouches) {
				const touch_x = (touch.clientX - rect.left) * scale_x;
				const touch_y = (touch.clientY - rect.top) * scale_y;

				// Update mallet position if it has this touch
				const mallets = Object.values(room_current().instances).filter(
					(inst) => inst.object_id === "obj_mallet" && inst.touch_id === touch.identifier,
				);

				for (const mallet of mallets) {
					mallet.target_x = touch_x;
					mallet.target_y = touch_y;
				}
			}
		});

		canvas.addEventListener("touchend", (e) => {
			e.preventDefault();
			for (const touch of e.changedTouches) {
				// Release touch from mallet
				const mallets = Object.values(room_current().instances).filter(
					(inst) => inst.object_id === "obj_mallet" && inst.touch_id === touch.identifier,
				);

				for (const mallet of mallets) {
					mallet.touch_id = null;
				}
			}
		});
	},
	draw(self) {
		// Draw scores
		gm.ctx.fillStyle = "white";
		gm.ctx.font = "48px Arial";
		gm.ctx.textAlign = "center";

		// Player 2 score (top)
		gm.ctx.save();
		gm.ctx.translate(160, 100);
		gm.ctx.rotate(Math.PI);
		gm.ctx.fillText(self.score_p2.toString(), 0, 0);
		gm.ctx.restore();

		// Player 1 score (bottom)
		gm.ctx.fillText(self.score_p1.toString(), 160, 476);
	},
});

// CREATE ROOM
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
	},
	fps: 60,
	bg_color: "#000000",
	setup() {
		instance_create("obj_mallet", 160, 430, 1, { player: 1 });
		instance_create("obj_mallet", 160, 146, 1, { player: 2 });

		instance_create("obj_goal", 128, 20, 0, { player: 1 }); // Top goal
		instance_create("obj_goal", 128, 546, 0, { player: 2 }); // Bottom goal

		return [{ id: "obj_field" }, { id: "obj_game_controller" }, { id: "obj_puck", x: 160, y: 288 }];
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
