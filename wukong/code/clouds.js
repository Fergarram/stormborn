create_object({
	id: "obj_clouds",
	create: (self) => {
		self.spawn_timer = 0;
		self.spawn_interval = 120; // Adjust for more/less frequent spawns
		self.controller = instance_ref("controller");

		// Spawn initial clouds
		const num_initial_clouds = 3; // Adjust this number for more/less initial clouds
		for (let i = 0; i < num_initial_clouds; i++) {
			// Random x position across the whole screen width
			const x = Math.random() * config.viewport_width;
			// Random y position
			const y = Math.random() * 128;

			instance_create("obj_cloud", x, y);
		}
	},
	step: (dt, self) => {
		if (self.controller.game_over) {
			return;
		}

		self.spawn_timer += 1;

		if (self.spawn_timer >= self.spawn_interval) {
			self.spawn_timer = 0;

			// Random y position between 0 and 128
			const y = Math.random() * 128;

			// Create cloud at right side of screen
			instance_create("obj_cloud", config.viewport_width + 32, y);
		}
	},
});

create_object({
	id: "obj_cloud",
	create: (self) => {
		self.z = -1;
		// Array of available cloud sprites
		const cloud_sprites = ["spr_cloud0", "spr_cloud1", "spr_cloud2", "spr_cloud3", "spr_cloud4", "spr_cloud5"];

		// Randomly select a cloud sprite
		self.sprite = cloud_sprites[Math.floor(Math.random() * cloud_sprites.length)];

		// Random movement speed
		self.speed = 0.5 + Math.random() * 0.5; // Speed between 0.5 and 1

		// Random slight y offset movement
		self.y_offset = 0;
		self.y_original = self.y;
		self.y_amplitude = 0.5; // How much it moves up/down
		self.y_frequency = 0.02 + Math.random() * 0.02; // How fast it moves up/down

		// Random slight transparency
		self.image_alpha = 0.7 + Math.random() * 0.3; // Alpha between 0.7 and 1

		self.controller = instance_ref("controller");
	},
	step: (dt, self) => {
		if (self.controller.game_over) {
			return;
		}
		// Move left
		self.x -= self.speed;

		// Subtle floating motion
		self.y_offset = Math.sin(self.x * self.y_frequency) * self.y_amplitude;
		self.y = self.y_original + self.y_offset;

		// Destroy if off screen
		if (self.x < -32) {
			instance_destroy(self);
		}
	},
});
