// OBJECTS
create_object({
	id: "obj_ctrl",
	create(self) {
		self.balls_remaining = 10;
		self.black_ball_destroyed = false;
		self.game_over = false;
		self.shots_taken = 0;
		self.show_results = false;
		instance_save("obj_ctrl", self);
	},
	draw(self) {
		if (self.show_results) {
			// Draw text
			gm.ctx.fillStyle = "white";
			gm.ctx.font = "32px Arial";
			gm.ctx.textAlign = "center";
			const center_x = config.viewport_width / config.scale / 2;
			const center_y = config.viewport_height / config.scale / 2;

			gm.ctx.font = "16px Arial";
			gm.ctx.fillText(self.balls_remaining > 0 ? "YOU LOST WITH" : "YOU WON WITH", center_x, center_y - 36);
			gm.ctx.font = "32px Arial";
			gm.ctx.fillText(`${self.shots_taken} MOVE${self.shots_taken === 1 ? "" : "S"}`, center_x, center_y);
			gm.ctx.font = "14px Arial";
			gm.ctx.fillText('Press "..." to restart', center_x, center_y + 64);
		}
	},
	step(dt, self) {
		if (self.show_results) {
			const keys = ["0", "Space", "*", "#"];
			if (keys.some((key) => gm.keys_pressed[key])) {
				room_restart();
			}
		}
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
		self.falling = false;
		self.fall_target_x = 0;
		self.fall_target_y = 0;
		self.min_scale = 0.8; // This controls how small the ball will get
		self.fall_speed = 0.1; // Controls how fast the ball moves to the hole
		self.fade_speed = 0.05; // Controls how fast the ball fades out
		self.rotation = 0; // Current rotation angle
		self.angular_velocity = 0; // How fast the ball is rotating
		self.rotation_friction = 0.98; // How quickly rotation slows down
		self.spin_factor = 0.2; // How much collision impact converts to spin

		// Smoothness control parameters
		self.friction = 0.98;
		self.movement_threshold = 0.5; // How many pixels to accumulate before moving (lower = more frequent updates)
		self.min_speed = 0.01; // Minimum speed before stopping completely
		self.bounce_factor = 0.8; // How bouncy the balls are against walls (0-1)
		self.collision_elasticity = 0.95; // How elastic ball-to-ball collisions are (0-1)

		// Add these new properties for animation control
		self.animation_acc = 0; // Accumulated animation progress
		self.animation_threshold = 1; // How much to accumulate before frame change
		self.min_animation_speed = 0.01; // Minimum speed before animation stops
		self.last_x = self.x; // Track previous position to determine direction
		self.last_y = self.y; // Track previous position to determine direction
		self.moving_right = true; // Track movement direction
	},
	step(dt, self) {
		const wall_size = 23;
		const speed = Math.sqrt(self.speed_x * self.speed_x + self.speed_y * self.speed_y);

		// @TODO: This problem requires 3d rendered sprites...
		if (false) {
			// Determine primary direction of movement
			if (speed > self.min_animation_speed) {
				const dx = self.x - self.last_x;
				const dy = self.y - self.last_y;

				// Use horizontal movement as primary direction indicator
				// If moving more vertically, use vertical movement instead
				if (Math.abs(dx) > Math.abs(dy)) {
					self.moving_right = dx > 0;
				} else {
					self.moving_right = dy > 0;
				}
			}

			// Accumulate animation progress based on speed
			self.animation_acc += speed * 0.2;

			// Update frame when accumulated progress reaches threshold
			if (self.animation_acc >= self.animation_threshold) {
				if (self.moving_right) {
					self.image_index = (self.image_index + 1) % 17;
				} else {
					self.image_index = (self.image_index - 1 + 17) % 17;
				}
				self.animation_acc -= self.animation_threshold;
			}

			// Stop animation if speed is very low
			if (speed < self.min_animation_speed) {
				self.animation_acc = 0;
			}

			// Store current position for next frame
			self.last_x = self.x;
			self.last_y = self.y;
		}

		if (self.falling) {
			// Move towards hole
			const dx = self.fall_target_x - self.x;
			const dy = self.fall_target_y - self.y;
			self.x += dx * self.fall_speed;
			self.y += dy * self.fall_speed;

			// Fade out
			self.image_alpha -= self.fade_speed;

			// Subtle shrink effect - will only shrink to min_scale
			const scale = Math.max(self.min_scale, self.image_alpha);
			self.image_scale_x = scale;
			self.image_scale_y = scale;

			// Destroy when completely faded
			if (self.image_alpha <= 0) {
				instance_destroy(self);
			}

			return;
		}

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

			// Play wall hit sound with volume based on speed
			const wall_hit_speed = Math.abs(self.speed_x);
			const volume = Math.max(0.05, Math.min(0.3, wall_hit_speed / 5));
			play_sound("snd_wall", { volume });
		}
		if (self.y < wall_size || self.y > config.viewport_height / config.scale - wall_size) {
			self.speed_y *= -self.bounce_factor;
			self.acc_y = 0;
			self.y = Math.min(Math.max(self.y, wall_size), config.viewport_height / config.scale - wall_size);

			const wall_hit_speed = Math.abs(self.speed_y);
			const volume = Math.max(0.05, Math.min(0.3, wall_hit_speed / 5));
			play_sound("snd_wall", { volume });
		}

		// Apply rotation from angular velocity
		self.rotation += self.angular_velocity;

		// Apply rotation friction
		self.angular_velocity *= self.rotation_friction;

		// Ball collision (replace the existing collision code)
		const other_balls = objects_colliding(self, "obj_ball");
		for (const other of other_balls) {
			if (other.id === self.id) continue;

			const dx = other.x - self.x;
			const dy = other.y - self.y;
			const dist = point_distance(self.x, self.y, other.x, other.y);

			if (dist < 16) {
				// Normal collision response
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

				// Calculate collision normal and relative velocity
				const nx = dx / dist;
				const ny = dy / dist;
				const dvx = other.speed_x - self.speed_x;
				const dvy = other.speed_y - self.speed_y;
				const impulse = (dvx * nx + dvy * ny) * self.collision_elasticity;

				// Calculate tangential velocity (perpendicular to normal)
				const tx = -ny; // Perpendicular to normal
				const ty = nx;
				const tv = dvx * tx + dvy * ty; // Tangential velocity

				// Apply linear impulse
				self.speed_x += impulse * nx;
				self.speed_y += impulse * ny;
				other.speed_x -= impulse * nx;
				other.speed_y -= impulse * ny;

				// Convert some of the tangential velocity into angular velocity
				self.angular_velocity += tv * self.spin_factor;
				other.angular_velocity -= tv * self.spin_factor;

				// Calculate collision speed for volume
				const collision_speed = Math.sqrt(dvx * dvx + dvy * dvy);
				const volume = Math.max(0.05, Math.min(0.3, collision_speed / 8));
				play_sound("snd_ball", { volume });
			}
		}

		// Add friction to angular velocity when the ball is nearly stopped
		if (Math.abs(self.speed_x) < 0.1 && Math.abs(self.speed_y) < 0.1) {
			self.angular_velocity *= 0.95; // Additional friction when nearly stopped
		}

		// Stop rotation if angular velocity is very small
		if (Math.abs(self.angular_velocity) < 0.01) {
			self.angular_velocity = 0;
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
			// Skip if ball is already falling
			if (ball.falling) continue;

			// Start the falling animation
			ball.falling = true;
			ball.fall_target_x = self.x;
			ball.fall_target_y = self.y;
			ball.speed_x = 0;
			ball.speed_y = 0;

			// Play hole sound
			play_sound("snd_hole", { volume: 0.7 });

			// Check if it's the white ball
			if (ball.ball_number === 0) {
				// Wait for fall animation to complete before showing results
				self.controller.game_over = true;
				setTimeout(() => {
					self.controller.show_results = true;
				}, 1000);
				return;
			}

			// Check if it's the black ball
			if (ball.ball_number === 5) {
				// If there are still other balls on the table (besides white ball)
				if (self.controller.balls_remaining > 1) {
					// > 1 because the black ball itself counts
					// Game over - lost because black ball was pocketed too early
					self.controller.game_over = true;
					self.controller.black_ball_destroyed = true;
					setTimeout(() => {
						self.controller.show_results = true;
					}, 1000);
					return;
				}
			}

			// Decrease remaining balls count
			if (ball.ball_number !== 0) {
				self.controller.balls_remaining--;
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
		self.rotation_speed = 1;
		self.target_angle = 0;
		self.base_offset = 100;
		self.pull_scale = 1;
		self.is_shooting = false;
		self.can_apply_physics = false;
		self.show_guide_line = false;
		self.toggle_cooldown = 0;
		self.toggle_cooldown_max = 10;
		self.shoot_distance = 15; // How far the cue moves forward when shooting
		self.bounce_progress = 0; // Animation progress (0 to 1)
		self.bounce_speed = 0.1; // Speed of the bounce animation
		self.controller = instance_get("obj_ctrl");
	},
	step(dt, self) {
		if (self.toggle_cooldown > 0) {
			self.toggle_cooldown--;
		}

		if ((gm.keys_pressed["*"] || gm.keys_pressed["a"]) && self.toggle_cooldown === 0) {
			self.show_guide_line = !self.show_guide_line;
			self.toggle_cooldown = self.toggle_cooldown_max; // Reset cooldown
		}

		const white_ball = instance_get("white_ball");
		if (!white_ball) return;

		if (self.controller.game_over) {
			self.image_alpha = 0;
			return;
		}

		const balls_moving = is_any_ball_moving();
		// Fade out when balls are moving, fade in when they're not
		if (balls_moving) {
			self.image_alpha = Math.max(0, self.image_alpha - 0.1); // Fade out speed
		} else {
			self.image_alpha = Math.min(1, self.image_alpha + 0.1); // Fade in speed

			// Only update position when balls are not moving
			const rad_angle = (self.target_angle * Math.PI) / 180;
			let offset = self.base_offset;

			if (self.pulling) {
				offset += self.power * self.pull_scale;
			}

			// Add shooting animation offset
			if (self.is_shooting) {
				if (self.bounce_progress < 0.5) {
					offset -= self.shoot_distance * (self.bounce_progress * 2);
				} else {
					offset -= self.shoot_distance * ((1 - self.bounce_progress) * 2);
				}

				self.bounce_progress += self.bounce_speed;

				if (self.bounce_progress >= 1) {
					self.is_shooting = false;
					self.bounce_progress = 0;
				}
			}

			// Update position
			self.x = white_ball.x - Math.cos(rad_angle) * offset;
			self.y = white_ball.y - Math.sin(rad_angle) * offset;
			self.image_angle = self.target_angle;

			// Only allow controls when cue is visible enough
			if (self.image_alpha > 0.5) {
				// Update target angle
				if (gm.keys_pressed["4"] || gm.keys_pressed["2"] || gm.keys_pressed["ArrowLeft"]) {
					self.target_angle += self.rotation_speed;
				}
				if (gm.keys_pressed["6"] || gm.keys_pressed["8"] || gm.keys_pressed["ArrowRight"]) {
					self.target_angle -= self.rotation_speed;
				}

				// Handle shooting
				if (gm.keys_pressed["5"] || gm.keys_pressed["ArrowUp"] || gm.keys_pressed["ArrowDown"]) {
					self.pulling = true;
					self.power = Math.min(self.power + 0.5, self.max_power);
				} else if (self.pulling) {
					self.is_shooting = true;
					self.bounce_progress = 0;
					self.pulling = false;

					// Increment shots counter
					self.controller.shots_taken++;

					setTimeout(() => {
						self.can_apply_physics = true;
					}, 100);
				}

				if (self.can_apply_physics) {
					white_ball.speed_x = Math.cos(rad_angle) * self.power;
					white_ball.speed_y = Math.sin(rad_angle) * self.power;

					// Play hit sound with volume based on power
					const volume = Math.max(0.1, Math.min(0.5, (self.power / self.max_power) * 0.8));
					play_sound("snd_hit", { volume });

					self.power = 0;
					self.can_apply_physics = false;
				}
			}
		}
	},
	draw(self) {
		const white_ball = instance_get("white_ball");
		if (!white_ball || !self.show_guide_line) return;

		// Calculate the line's start and end points
		const rad_angle = (self.target_angle * Math.PI) / 180;
		const line_length = 320;

		// Start from white ball
		const start_x = white_ball.x;
		const start_y = white_ball.y;
		const end_x = start_x + Math.cos(rad_angle) * line_length;
		const end_y = start_y + Math.sin(rad_angle) * line_length;

		// Draw dotted line
		gm.ctx.beginPath();
		gm.ctx.setLineDash([4, 4]); // Create dotted effect [dash length, gap length]
		gm.ctx.moveTo(start_x, start_y);
		gm.ctx.lineTo(end_x, end_y);
		gm.ctx.strokeStyle = `rgba(255, 255, 255, ${self.image_alpha * 0.2})`;
		gm.ctx.lineWidth = 2;
		gm.ctx.stroke();

		// Reset line dash to solid
		gm.ctx.setLineDash([]);
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
		// ball.sprite = "spr_ball_animated"; // Use the new animated sprite
		ball.sprite = "spr_ball_white"; // Use the new animated sprite
		ball.base_image_speed = 0; // Start with no animation
	} else {
		ball.sprite = "spr_balls";
		ball.image_index = number;
	}
	ball.ball_number = number;
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
		instance_create("obj_ctrl", 0, 0, 1000);

		// Create white ball
		const white_ball = create_ball(80, 120, 0);
		instance_save("white_ball", white_ball);

		// Create rack of balls in triangle formation
		const rack_center_x = 200; // Adjust this value to position the rack horizontally
		const rack_center_y = config.viewport_height / config.scale / 2; // Center vertically
		const ball_spacing = 16; // Slightly adjust spacing between balls

		// Standard 8-ball rack arrangement
		const rack_order = [1, 2, 3, 4, 5, 10, 7, 8, 9, 6];
		let ball_index = 0;

		for (let row = 0; row < 4; row++) {
			for (let col = 0; col <= row; col++) {
				if (ball_index < rack_order.length) {
					// Calculate position relative to rack center
					const ball_x = Math.round(rack_center_x + row * ball_spacing);
					const ball_y = Math.round(rack_center_y + (col * ball_spacing - (row * ball_spacing) / 2));
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
