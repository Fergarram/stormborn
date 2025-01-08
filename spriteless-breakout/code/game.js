// OBJECTS
create_object({
	id: "obj_paddle",
	collision_mask: { type: "rect", geom: [0, 0, 60, 10] },
	create(self) {
		self.speed = 5;
		instance_save("paddle", self);
	},
	step(dt, self) {
		// Move paddle with arrow keys
		if (gm.keys_pressed.ArrowLeft) {
			self.x = Math.max(0, self.x - self.speed);
		}
		if (gm.keys_pressed.ArrowRight) {
			self.x = Math.min(config.viewport_width / config.scale - 60, self.x + self.speed);
		}
	},
	draw(self) {
		gm.ctx.fillStyle = "#00ff00";
		gm.ctx.fillRect(self.x, self.y, 60, 10);
	},
});

create_object({
	id: "obj_ball",
	collision_mask: { type: "circle", geom: [5] },
	create(self) {
		self.speed_x = 3;
		self.speed_y = -3;
		instance_save("ball", self);
	},
	step(dt, self) {
		// Move ball
		self.x += self.speed_x;
		self.y += self.speed_y;

		// Bounce off walls
		if (self.x <= 0 || self.x >= config.viewport_width / config.scale) {
			self.speed_x *= -1;
		}
		if (self.y <= 0) {
			self.speed_y *= -1;
		}

		// Check if ball is below paddle
		if (self.y > config.viewport_height / config.scale) {
			room_restart();
		}

		// Bounce off paddle
		const paddle = instance_ref("paddle");
		if (instances_colliding(self, paddle)) {
			self.speed_y = -Math.abs(self.speed_y);
			// Add some randomness to x direction
			self.speed_x += (Math.random() - 0.5) * 2;
		}

		// Bounce off bricks
		const colliding_bricks = objects_colliding(self, "obj_brick");
		if (colliding_bricks.length > 0) {
			self.speed_y *= -1;
			instance_destroy(colliding_bricks[0]);
		}
	},
	draw(self) {
		gm.ctx.fillStyle = "#ffffff";
		gm.ctx.beginPath();
		gm.ctx.arc(self.x, self.y, 5, 0, Math.PI * 2);
		gm.ctx.fill();
	},
});

create_object({
	id: "obj_brick",
	collision_mask: { type: "rect", geom: [0, 0, 40, 15] },
	create(self) {
		self.color = `hsl(${Math.random() * 360}, 50%, 50%)`;
	},
	draw(self) {
		gm.ctx.fillStyle = self.color;
		gm.ctx.fillRect(self.x, self.y, 40, 15);
	},
});

// Update room setup
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
	bg_color: "#555555",
	setup() {
		// Create paddle
		instance_create("obj_paddle", 130, 200);

		// Create ball
		instance_create("obj_ball", 160, 180);

		// Create bricks
		for (let row = 0; row < 5; row++) {
			for (let col = 0; col < 7; col++) {
				instance_create("obj_brick", 20 + col * 45, 20 + row * 20);
			}
		}

		return [];
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
