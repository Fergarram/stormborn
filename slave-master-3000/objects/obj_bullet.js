create_spr({
	id: "spr_bullet",
	filepath: "assets/sprites/bullet.png",
	frame_width: 64,
	frame_height: 16,
	frames: 1,
	origin_x: 32,
	origin_y: 8,
});

create_obj({
	id: "obj_bullet",
	sprite: "spr_bullet",
	collision_mask: { type: "circle", geom: [3] },
	create: (self) => {
		self.speed = 10;
		self.image_scale_x = 0.25;
		self.image_scale_y = 0.25;
		self.player = instance_ref("player");
		self.lifespan = 60 * 5;
	},
	step: (dt, self) => {
		self.x += Math.cos((self.direction * Math.PI) / 180) * self.speed;
		self.y += Math.sin((self.direction * Math.PI) / 180) * self.speed;

		const asteroid = instance_collision(self, "obj_asteroid");
		if (asteroid) {
			for (let i = 0; i < 10; i++) {
				const spark = instance_create("obj_spark");
				spark.x = self.x;
				spark.y = self.y;
			}

			// Spawn gold objects
			const gold_count = asteroid.image_index === 0 ? 7 : 8 - asteroid.image_index * 2;
			for (let i = 0; i < gold_count; i++) {
				const gold = instance_create("obj_gold");
				gold.x = self.x;
				gold.y = self.y;
			}

			self.player.asteroid_count++;

			instance_destroy(self);
			instance_destroy(asteroid);
		}

		self.lifespan--;
		if (self.lifespan <= 0) {
			instance_destroy(self);
		}
	},
});
