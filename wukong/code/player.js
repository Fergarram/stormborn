function jump_key_pressed() {
	return gm.keys_pressed.Space || gm.keys_pressed["8"] || gm.keys_pressed.ArrowUp;
}

function fall_key_pressed() {
	return gm.keys_pressed.ArrowDown || gm.keys_pressed.ArrowRight || gm.keys_pressed["0"];
}

create_object({
	id: "obj_goku",
	sprite: "spr_goku",
	collision_mask: { type: "rect", geom: [-9, -11, 18, 22] },
	create(self) {
		self.gravity = 0.5;
		self.jump_force = -7;
		self.vertical_speed = 0;
		self.horizontal_speed = 0;
		self.can_flap = true;
		self.on_ground = false;
		self.initial_x = config.viewport_width / (4 * config.scale);
		instance_save("player", self);
		self.controller = instance_get("controller");
	},
	step(dt, self) {
		if (!self.controller.game_over) {
			// Apply gravity
			if (!self.on_ground) {
				// Add fast fall and horizontal movement when stomping
				if (fall_key_pressed()) {
					self.vertical_speed += self.gravity * 5;
					self.horizontal_speed = 3.5; // Move right when stomping
					self.sprite = "spr_goku_stomp";
					self.image_index = 0;
				} else {
					self.vertical_speed += self.gravity;
					// Remove horizontal centering while in air
					self.image_speed = 0;
					if (self.sprite !== "spr_goku_air") self.sprite = "spr_goku_air";
					self.image_index = self.vertical_speed > 1.5 ? 1 : 0;
				}
			} else {
				if (self.sprite !== "spr_goku") self.sprite = "spr_goku";
				self.image_speed = 3;
				// Only apply centering force when on ground
				self.horizontal_speed = -(self.x - self.initial_x) * 0.1;
			}

			// Jump when space is pressed
			if (jump_key_pressed() && (self.on_ground || self.can_flap)) {
				self.vertical_speed = self.jump_force;
				self.can_flap = false;
				self.on_ground = false;
			}
			if (!jump_key_pressed()) {
				self.can_flap = true;
			}

			// Update position
			self.y += self.vertical_speed;
			self.x += self.horizontal_speed;

			// Ground collision check
			if (self.y >= config.viewport_height + self.collision_mask.geom[1] - 18) {
				self.y = config.viewport_height + self.collision_mask.geom[1] - 18;
				self.on_ground = true;
				self.vertical_speed = 0;
			} else {
				self.on_ground = false;
			}

			// Check collisions with blocks
			const blocks = objects_colliding(self, "obj_column_part");
			if (blocks.length > 0) {
				self.controller.game_over = true;
			}
		} else {
			// Falls when game over
			self.vertical_speed = 0;
			self.horizontal_speed = 0;
			self.image_speed = 0;
		}

		if (self.controller.game_over_timer >= 1 && jump_key_pressed()) {
			room_restart();
		}
	},
});
