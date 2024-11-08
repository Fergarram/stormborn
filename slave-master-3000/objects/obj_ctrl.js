create_obj({
	id: "obj_ctrl",
	create: (self) => {
		self.player = instance_ref("player");
	},
	step: (dt, self) => {
		const room = gm.rooms[gm.current_room];

		if (Math.random() < 0.1 && instance_count("obj_asteroid") <= 300) {
			let asteroid_x, asteroid_y;
			do {
				asteroid_x = Math.random() * room.width;
				asteroid_y = Math.random() * room.height;
			} while (point_distance(asteroid_x, asteroid_y, self.player.x, self.player.y) < 100);

			const asteroid = instance_create("obj_asteroid_spawn");
			asteroid.x = asteroid_x;
			asteroid.y = asteroid_y;
		}

		// @TODO: Fix camera shake for when player is being followed by camera
		//        Solution might be to have a camera object that follows the player
		//        and so the shake is applied to the camera object instead of the room
		if (room.camera.shake > 0) {
			room.camera.x += (Math.random() - 0.5) * room.camera.shake;
			room.camera.y += (Math.random() - 0.5) * room.camera.shake;
			room.camera.shake *= 0.9;
			if (room.camera.shake < 0.1) {
				room.camera.shake = 0;
			}
		} else {
			// Smoothly reset camera position
			const lerp_factor = 0.1; // Adjust this value to control the smoothness of the reset
			room.camera.x += (0 - room.camera.x) * lerp_factor;
			room.camera.y += (0 - room.camera.y) * lerp_factor;
		}

		if (gm.keys_pressed["Space"]) {
			// console.log(Object.keys(gm.rooms[gm.current_room].instances).length);
			console.log(instance_count("obj_asteroid"));
		}
	},
	draw: (self) => {
		gm.ctx.save();
		gm.ctx.fillStyle = "white";
		gm.ctx.font = "16px monospace";
		gm.ctx.fillText(`Ship Integrity: ${self.player.health}`, 10, 20);
		gm.ctx.fillText(`Ship Uptime: ${Math.floor(self.player.time_alive)}s`, 10, 40);
		gm.ctx.fillText(`Asteroids: ${self.player.asteroid_count}`, 10, 60);
		gm.ctx.fillText(`Gold: ${self.player.gold}`, 10, 80);
		gm.ctx.restore();
	},
});
