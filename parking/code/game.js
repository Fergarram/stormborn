// CONFIG
const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 240;
const SCALE = 2;

// CONSTANTS
const CAR = {
	WIDTH: 40,
	HEIGHT: 20,
	WHEEL_OFFSET_SIDE: 8,
	WHEEL_OFFSET_FRONT: 15,
	WHEEL_OFFSET_BACK: 15,
	WHEEL_WIDTH: 8,
	WHEEL_HEIGHT: 6,
};

const PARKING = {
	WIDTH: 50,
	HEIGHT: 30,
	BUFFER: 0,
};

const PARKING_SUCCESS_DELAY = 1400;

// OBJECTS
create_object({
	id: "obj_car",
	collision_mask: { type: "rect", geom: [-CAR.WIDTH / 2, -CAR.HEIGHT / 2, CAR.WIDTH, CAR.HEIGHT] },
	create(self) {
		self.speed = 0;
		self.max_speed = 1.5;
		self.acceleration = 0.05;
		self.friction = 0.1;
		self.turn_speed = 4;
		self.wheel_angle = 0;
		self.max_wheel_angle = 120;
		self.max_visible_wheel_angle = 60;

		// Create front wheels
		self.wheel_front_left = instance_create(
			"obj_wheel",
			self.x - CAR.WHEEL_OFFSET_FRONT,
			self.y - CAR.WHEEL_OFFSET_SIDE,
			-10,
		);
		self.wheel_front_right = instance_create(
			"obj_wheel",
			self.x - CAR.WHEEL_OFFSET_FRONT,
			self.y + CAR.WHEEL_OFFSET_SIDE,
			-10,
		);

		// Create back wheels
		self.wheel_back_left = instance_create(
			"obj_wheel",
			self.x + CAR.WHEEL_OFFSET_BACK,
			self.y - CAR.WHEEL_OFFSET_SIDE,
			-10,
		);
		self.wheel_back_right = instance_create(
			"obj_wheel",
			self.x + CAR.WHEEL_OFFSET_BACK,
			self.y + CAR.WHEEL_OFFSET_SIDE,
			-10,
		);

		instance_ref("car", self);
	},
	step(dt, self) {
		// Acceleration
		if (gm.keydown.ArrowUp || gm.keydown["5"]) {
			self.speed = Math.min(self.speed + self.acceleration, self.max_speed);
		} else if (gm.keydown.ArrowDown) {
			self.speed = Math.max(self.speed - self.acceleration, -self.max_speed);
		} else {
			// Apply friction
			if (Math.abs(self.speed) > 0) {
				self.speed -= Math.sign(self.speed) * self.friction;
				if (Math.abs(self.speed) < self.friction) self.speed = 0;
			}
		}

		// Steering
		if (gm.keydown.ArrowRight) {
			self.wheel_angle = Math.min(self.wheel_angle + self.turn_speed, self.max_wheel_angle);
		} else if (gm.keydown.ArrowLeft) {
			self.wheel_angle = Math.max(self.wheel_angle - self.turn_speed, -self.max_wheel_angle);
		}

		// Update rotation based on wheel angle and speed
		if (self.speed !== 0) {
			self.image_angle += (self.wheel_angle * self.speed) / 100;
		}

		// Move car based on angle and speed
		const rad = (self.image_angle * Math.PI) / 180;
		self.x += Math.cos(rad) * self.speed;
		self.y += Math.sin(rad) * self.speed;

		// Update wheel positions
		// Front wheels
		self.wheel_front_left.x = self.x + Math.cos(rad) * CAR.WHEEL_OFFSET_FRONT - Math.sin(rad) * CAR.WHEEL_OFFSET_SIDE;
		self.wheel_front_left.y = self.y + Math.sin(rad) * CAR.WHEEL_OFFSET_FRONT + Math.cos(rad) * CAR.WHEEL_OFFSET_SIDE;
		self.wheel_front_right.x = self.x + Math.cos(rad) * CAR.WHEEL_OFFSET_FRONT + Math.sin(rad) * CAR.WHEEL_OFFSET_SIDE;
		self.wheel_front_right.y = self.y + Math.sin(rad) * CAR.WHEEL_OFFSET_FRONT - Math.cos(rad) * CAR.WHEEL_OFFSET_SIDE;

		// Back wheels
		self.wheel_back_left.x = self.x - Math.cos(rad) * CAR.WHEEL_OFFSET_BACK - Math.sin(rad) * CAR.WHEEL_OFFSET_SIDE;
		self.wheel_back_left.y = self.y - Math.sin(rad) * CAR.WHEEL_OFFSET_BACK + Math.cos(rad) * CAR.WHEEL_OFFSET_SIDE;
		self.wheel_back_right.x = self.x - Math.cos(rad) * CAR.WHEEL_OFFSET_BACK + Math.sin(rad) * CAR.WHEEL_OFFSET_SIDE;
		self.wheel_back_right.y = self.y - Math.sin(rad) * CAR.WHEEL_OFFSET_BACK - Math.cos(rad) * CAR.WHEEL_OFFSET_SIDE;

		// Update wheel angles
		const limited_angle = Math.max(-self.max_visible_wheel_angle, Math.min(self.max_visible_wheel_angle, self.wheel_angle));
		// Only front wheels turn
		self.wheel_front_left.image_angle = self.image_angle + limited_angle;
		self.wheel_front_right.image_angle = self.image_angle + limited_angle;
		// Back wheels just match car rotation
		self.wheel_back_left.image_angle = self.image_angle;
		self.wheel_back_right.image_angle = self.image_angle;
	},
	draw(self) {
		// Draw car body
		gm.ctx.save();
		gm.ctx.translate(self.x, self.y);
		gm.ctx.rotate((self.image_angle * Math.PI) / 180);

		// Main body
		gm.ctx.fillStyle = "blue";
		gm.ctx.fillRect(-CAR.WIDTH / 2, -CAR.HEIGHT / 2, CAR.WIDTH, CAR.HEIGHT);

		// Hood
		gm.ctx.fillStyle = "lightblue";
		gm.ctx.fillRect(-CAR.WIDTH / 4, -CAR.HEIGHT / 2 + 2, CAR.WIDTH / 2, CAR.HEIGHT - 4);

		gm.ctx.restore();
	},
});

create_object({
	id: "obj_wheel",
	collision_mask: { type: "rect", geom: [-CAR.WHEEL_WIDTH / 2, -CAR.WHEEL_HEIGHT / 2, CAR.WHEEL_WIDTH, CAR.WHEEL_HEIGHT] },
	draw(self) {
		gm.ctx.save();
		gm.ctx.translate(self.x, self.y);
		gm.ctx.rotate((self.image_angle * Math.PI) / 180);

		gm.ctx.fillStyle = "black";
		gm.ctx.fillRect(-CAR.WHEEL_WIDTH / 2, -CAR.WHEEL_HEIGHT / 2, CAR.WHEEL_WIDTH, CAR.WHEEL_HEIGHT);

		gm.ctx.restore();
	},
});

create_object({
	id: "obj_parking_spot",
	collision_mask: { type: "rect", geom: [-PARKING.WIDTH / 2, -PARKING.HEIGHT / 2, PARKING.WIDTH, PARKING.HEIGHT] },
	create(self) {
		self.occupied = false;
		self.highlight = false;
		self.occupation_timer = 0;
	},
	step(dt, self) {
		const car = instance_ref("car");
		if (car) {
			// Get car corners in world space
			const car_rad = (car.image_angle * Math.PI) / 180;
			const car_corners = [
				// Front right
				{
					x: car.x + (Math.cos(car_rad) * CAR.WIDTH) / 2 - (Math.sin(car_rad) * CAR.HEIGHT) / 2,
					y: car.y + (Math.sin(car_rad) * CAR.WIDTH) / 2 + (Math.cos(car_rad) * CAR.HEIGHT) / 2,
				},
				// Front left
				{
					x: car.x + (Math.cos(car_rad) * CAR.WIDTH) / 2 + (Math.sin(car_rad) * CAR.HEIGHT) / 2,
					y: car.y + (Math.sin(car_rad) * CAR.WIDTH) / 2 - (Math.cos(car_rad) * CAR.HEIGHT) / 2,
				},
				// Back right
				{
					x: car.x - (Math.cos(car_rad) * CAR.WIDTH) / 2 - (Math.sin(car_rad) * CAR.HEIGHT) / 2,
					y: car.y - (Math.sin(car_rad) * CAR.WIDTH) / 2 + (Math.cos(car_rad) * CAR.HEIGHT) / 2,
				},
				// Back left
				{
					x: car.x - (Math.cos(car_rad) * CAR.WIDTH) / 2 + (Math.sin(car_rad) * CAR.HEIGHT) / 2,
					y: car.y - (Math.sin(car_rad) * CAR.WIDTH) / 2 - (Math.cos(car_rad) * CAR.HEIGHT) / 2,
				},
			];

			// Get parking spot bounds
			const spot_rad = (self.image_angle * Math.PI) / 180;
			const spot_corners = [
				// Front right
				{
					x:
						self.x +
						Math.cos(spot_rad) * (PARKING.WIDTH / 2 + PARKING.BUFFER) -
						Math.sin(spot_rad) * (PARKING.HEIGHT / 2 + PARKING.BUFFER),
					y:
						self.y +
						Math.sin(spot_rad) * (PARKING.WIDTH / 2 + PARKING.BUFFER) +
						Math.cos(spot_rad) * (PARKING.HEIGHT / 2 + PARKING.BUFFER),
				},
				// Front left
				{
					x:
						self.x +
						Math.cos(spot_rad) * (PARKING.WIDTH / 2 + PARKING.BUFFER) +
						Math.sin(spot_rad) * (PARKING.HEIGHT / 2 + PARKING.BUFFER),
					y:
						self.y +
						Math.sin(spot_rad) * (PARKING.WIDTH / 2 + PARKING.BUFFER) -
						Math.cos(spot_rad) * (PARKING.HEIGHT / 2 + PARKING.BUFFER),
				},
				// Back right
				{
					x:
						self.x -
						Math.cos(spot_rad) * (PARKING.WIDTH / 2 + PARKING.BUFFER) -
						Math.sin(spot_rad) * (PARKING.HEIGHT / 2 + PARKING.BUFFER),
					y:
						self.y -
						Math.sin(spot_rad) * (PARKING.WIDTH / 2 + PARKING.BUFFER) +
						Math.cos(spot_rad) * (PARKING.HEIGHT / 2 + PARKING.BUFFER),
				},
				// Back left
				{
					x:
						self.x -
						Math.cos(spot_rad) * (PARKING.WIDTH / 2 + PARKING.BUFFER) +
						Math.sin(spot_rad) * (PARKING.HEIGHT / 2 + PARKING.BUFFER),
					y:
						self.y -
						Math.sin(spot_rad) * (PARKING.WIDTH / 2 + PARKING.BUFFER) -
						Math.cos(spot_rad) * (PARKING.HEIGHT / 2 + PARKING.BUFFER),
				},
			];

			// Check if car corners are within the parking spot bounds
			let corners_inside = 0;
			for (const corner of car_corners) {
				if (point_in_polygon(corner.x, corner.y, spot_corners.map((c) => [c.x, c.y]).flat())) {
					corners_inside++;
				}
			}

			// Check if car is properly parked
			const is_parked = corners_inside >= 3;
			self.highlight = is_parked;

			if (is_parked) {
				self.occupation_timer += dt;
				if (self.occupation_timer >= PARKING_SUCCESS_DELAY) {
					self.occupied = true;
					self.x = Math.random() * (ROOM_WIDTH - 100) + 50;
					self.y = Math.random() * (ROOM_HEIGHT - 100) + 50;
					self.image_angle = Math.floor(Math.random() * 4) * 90;
					self.occupation_timer = 0;
				}
			} else {
				self.occupation_timer = 0;
				self.occupied = false;
				self.highlight = false;
			}
		}
	},
	draw(self) {
		gm.ctx.save();
		gm.ctx.translate(self.x, self.y);
		gm.ctx.rotate((self.image_angle * Math.PI) / 180);

		gm.ctx.strokeStyle = self.highlight ? "yellow" : "white";
		gm.ctx.lineWidth = 2;
		gm.ctx.strokeRect(-PARKING.WIDTH / 2, -PARKING.HEIGHT / 2, PARKING.WIDTH, PARKING.HEIGHT);

		gm.ctx.restore();
	},
});

// Create room
create_room({
	id: "rm_game",
	width: ROOM_WIDTH,
	height: ROOM_HEIGHT,
	screen: {
		width: ROOM_WIDTH,
		height: ROOM_HEIGHT,
		final_width: ROOM_WIDTH * SCALE,
		final_height: ROOM_HEIGHT * SCALE,
	},
	fps: 60,
	bg_color: "#555555",
	setup() {
		return [
			{
				id: "obj_car",
				x: 100,
				y: 100,
			},
			{
				id: "obj_parking_spot",
				x: 250,
				y: 150,
				z: -100,
			},
		];
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
