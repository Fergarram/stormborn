create_spr({
	id: "spr_spark",
	filepath: "assets/sprites/spark.png",
	frame_width: 8,
	frame_height: 8,
	frames: 1,
	origin_x: 4,
	origin_y: 4,
});

create_obj({
	id: "obj_spark",
	sprite: "spr_spark",
	collision_mask: { type: "circle", geom: [4] },
	create: (self) => {
		self.speed = Math.random() * 1 + 1;
		self.direction = Math.random() * 360;
		self.lifespan = 17;
		self.image_scale_x = 0.5 + Math.random() * 0.5;
		self.image_scale_y = self.image_scale_x;
		self.image_index = 0;
		self.image_speed = 0;
	},
	step: (dt, self) => {
		self.x += Math.cos((self.direction * Math.PI) / 180) * self.speed;
		self.y += Math.sin((self.direction * Math.PI) / 180) * self.speed;

		self.lifespan--;
		if (self.lifespan <= 0) {
			instance_destroy(self);
		}

		// Fade out
		self.speed *= 0.98;
		self.image_scale_x *= 0.98;
		self.image_scale_y *= 0.98;
		self.image_alpha *= 0.98;
	},
});
