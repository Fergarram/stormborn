create_sprite({
	id: "spr_player",
	filepath: "assets/sprites/mario.png",
	frames: 4,
	frame_width: 12,
	frame_height: 14,
	origin_x: 6,
	origin_y: 6,
});

create_object({
	id: "obj_player",
	sprite: "spr_player",
	collision_mask: {
		type: "rect",
		geom: [-6, -4, 12, 14],
	},
	create(self) {
		self.v_speed = 0;
		self.h_speed = 0;
		self.jump_speed = -4.75;
		self.move_speed = 2.75;
		self.gravity = 0.3;
		self.grounded = false;
	},
	step(dt, self) {
		// Calculate next position
		let next_x = self.x;
		let next_y = self.y;

		// Horizontal movement
		if (gm.keys_pressed["ArrowLeft"]) {
			self.h_speed = -self.move_speed;
			self.image_scale_x = -1;
		} else if (gm.keys_pressed["ArrowRight"]) {
			self.h_speed = self.move_speed;
			self.image_scale_x = 1;
		} else {
			self.h_speed = 0;
		}

		// Apply gravity
		self.v_speed += self.gravity;

		// Jumping
		if ((gm.keys_pressed["ArrowUp"] || gm.keys_pressed["Space"]) && self.grounded) {
			self.v_speed = self.jump_speed;
			self.grounded = false;
		}

		// Calculate next position
		next_x = self.x + self.h_speed;
		next_y = self.y + self.v_speed;

		// Temporarily move to check collisions
		let original_x = self.x;
		let original_y = self.y;

		// Check horizontal movement first
		self.x = Math.round(next_x);

		// Then check vertical movement
		self.y = Math.round(next_y);

		// First handle floor collisions
		let floor_collisions = objects_colliding(self, "obj_floor");
		if (floor_collisions.length > 0) {
			for (const floor of floor_collisions) {
				if (self.v_speed > 0) {
					// Moving down
					self.y = floor.y - floor.collision_mask.geom[3];
					self.grounded = true;
					self.v_speed = 0;
				}
			}
		}

		// Then handle block collisions (brick and question blocks)
		let block_collisions = [...objects_colliding(self, "obj_brick"), ...objects_colliding(self, "obj_question")];

		if (block_collisions.length > 0) {
			for (const block of block_collisions) {
				if (self.v_speed > 0) {
					// Moving down
					self.y = block.y - block.collision_mask.geom[3];
					self.grounded = true;
					self.v_speed = 0;
				} else if (self.v_speed < 0) {
					// Moving up - hit block from below
					self.y = block.y + block.collision_mask.geom[3];
					self.v_speed = 0;

					// Handle block-specific behavior
					if (block.object_id === "obj_brick") {
						block.was_hit = true;
					} else if (block.object_id === "obj_question") {
						block.was_hit = true;
					}
				}
			}
		}

		// If no collisions occurred, player is not grounded
		if (floor_collisions.length === 0 && block_collisions.length === 0) {
			self.grounded = false;
		}

		// Animation
		if (Math.abs(self.h_speed) > 0) {
			self.image_speed = 2.5;
		} else {
			self.image_speed = 0;
			self.image_index = 0;
		}

		if (!self.grounded) {
			self.image_index = 3;
			self.image_speed = 0;
		}
	},
});
