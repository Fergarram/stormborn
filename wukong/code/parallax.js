create_object({
	id: "obj_background",
	sprite: "spr_background",
	create(self) {
		// Define layers with their sprites and speeds
		self.layers = [
			{ sprite: "spr_background", speed: 1 },
			// { sprite: "spr_mist0", speed: 1.25 },
			// { sprite: "spr_mist", speed: 1.5 },
		];

		// Create two instances of each layer for seamless scrolling
		self.layer_instances = self.layers.map((layer) => ({
			sprite: layer.sprite,
			speed: layer.speed,
			first: {
				x: 0,
				instance: instance_create("obj_background_part", 0, 0),
			},
			second: {
				x: 280 / config.scale,
				instance: instance_create("obj_background_part", 280 / config.scale, 0),
			},
		}));

		// Set up each layer instance
		self.layer_instances.forEach((layer, index) => {
			layer.first.instance.sprite = layer.sprite;
			layer.second.instance.sprite = layer.sprite;
			layer.first.instance.z = -1000 + index;
			layer.second.instance.z = -1000 + index;
		});

		self.controller = instance_ref("controller");
	},
	step(dt, self) {
		if (!self.controller.game_over) {
			// Update each layer
			self.layer_instances.forEach((layer) => {
				// Move both instances of this layer
				layer.first.x -= layer.speed;
				layer.second.x -= layer.speed;

				// Update instance positions
				layer.first.instance.x = layer.first.x;
				layer.second.instance.x = layer.second.x;

				// Reset positions when off screen
				if (layer.first.x <= -(280 / config.scale)) {
					layer.first.x = layer.second.x + 280 / config.scale;
				}
				if (layer.second.x <= -(280 / config.scale)) {
					layer.second.x = layer.first.x + 280 / config.scale;
				}
			});
		}
	},
});

// Helper object for the second background instance
create_object({
	id: "obj_background_part",
	sprite: "spr_background",
});

create_object({
	id: "obj_floor",
	sprite: "spr_floor",
	create(self) {
		self.x = 0;
		self.scroll_speed = 3; // Same speed as blocks

		// Create second floor instance for seamless scrolling
		self.second_floor = instance_create(
			"obj_floor_part",
			280 / config.scale,
			config.viewport_height / config.scale - 20,
			-500,
		);
		instance_save("floor_second", self.second_floor);

		self.controller = instance_ref("controller");
	},
	step(dt, self) {
		if (!self.controller.game_over) {
			// Move both floor instances
			self.x -= self.scroll_speed;
			self.second_floor.x -= self.scroll_speed;

			// Reset positions when moved off screen
			if (self.x <= -(280 / config.scale)) {
				self.x = self.second_floor.x + 280 / config.scale;
			}
			if (self.second_floor.x <= -(280 / config.scale)) {
				self.second_floor.x = self.x + 280 / config.scale;
			}
		}
	},
});

// Helper object for the second floor instance
create_object({
	id: "obj_floor_part",
	sprite: "spr_floor",
});
