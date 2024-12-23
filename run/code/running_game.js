// CREATE ROOM
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
		return [{ id: "obj_game_controller" }, { id: "obj_background" }];
	},
});

// BACKGROUND OBJECT
create_object({
	id: "obj_background",
	sprite: "spr_background",
	create(self) {
		self.x = 0;
		self.y = 0;
		self.z = -1;
	},
});

//SPEED MODIFIER FOR DEBUGGING

//increase for faster, decrease for slower

let KARINA = 3.3; // MAX SPEED
let WINTER = 0.33; // ACCELERATION

//decrease for faster, increase for slower

let GISELLE = 0.05; // DECELERATION
let NINGNING = 0.02; // FRICTION

// PLAYER OBJECT
create_object({
	id: "obj_player",
	collision_mask: { type: "rect", geom: [0, 0, 32, 48] },
	create(self, props) {
		self.playerNumber = props.playerNumber;
		self.keys = props.keys;
		self.color = props.color;
		self.sprite = props.sprite;
		self.x = 0;
		self.y = self.playerNumber * 48;
		self.speed = 0;
		self.maxSpeed = KARINA;
		self.lastKeyPressed = null;
		self.expectedKey = 0;
		self.image_speed = 0;
		self.finished = false;
		self.acceleration = WINTER;
		self.deceleration = GISELLE;
		self.friction = NINGNING;
		self.animationSpeed = 0;
		self.animationDeceleration = 0.1;
	},
	step(dt, self) {
		if (self.finished) return;

		let keyPressed = null;
		let currentKey = self.keys[self.expectedKey];

		// Check if the correct key in sequence is pressed
		if (gm.keys_pressed[currentKey] && !self.lastKeyPressed) {
			keyPressed = currentKey;
			// Switch to expect the other key next time
			self.expectedKey = self.expectedKey === 0 ? 1 : 0;
		}

		if (keyPressed) {
			self.speed = Math.min(self.speed + self.acceleration, self.maxSpeed);
			self.lastKeyPressed = keyPressed;
			self.animationSpeed = self.speed / 2;
		} else {
			// Apply deceleration when no key is pressed
			self.speed = Math.max(self.speed - self.deceleration, 0);
			if (!gm.keys_pressed[self.keys[0]] && !gm.keys_pressed[self.keys[1]]) {
				self.lastKeyPressed = null;
			}
		}

		// Apply friction for sliding effect
		if (self.speed > 0) {
			self.speed = Math.max(self.speed - self.friction, 0);
		}

		// Gradually slow down animation
		if (self.animationSpeed > 0) {
			self.animationSpeed = Math.max(self.animationSpeed - self.animationDeceleration, 0);
		}

		self.x += self.speed;
		self.image_speed = self.animationSpeed;

		if (self.x > 320 - 32 / 3) {
			self.finished = true;
			instance_get("obj_game_controller").playerFinished(self.playerNumber);
		}
	},
});

// GAME CONTROLLER OBJECT
create_object({
	id: "obj_game_controller",
	create(self) {
		self.playerColors = ["magenta", "red", "blue", "green", "cyan", "yellow"];
		self.playerKeys = [
			["c", "v"],
			["j", "k"],
			["[", "]"],
			["ArrowLeft", "ArrowDown"],
			["5", "6"],
			["1", "2"],
		];
		self.finishedPlayers = [];
		self.gameEnded = false;

		// Shuffle colors
		for (let i = self.playerColors.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[self.playerColors[i], self.playerColors[j]] = [self.playerColors[j], self.playerColors[i]];
		}

		// Create players
		for (let i = 0; i < 6; i++) {
			instance_create("obj_player", 0, 0, 0, {
				playerNumber: i,
				keys: self.playerKeys[i],
				color: self.playerColors[i],
				sprite: `spr_${self.playerColors[i]}`,
			});
		}
	},
	playerFinished(playerNumber) {
		this.finishedPlayers.push(playerNumber);
		if (this.finishedPlayers.length === 2) {
			this.gameEnded = true;
		}
	},
	draw(self) {
		if (self.gameEnded) {
			gm.ctx.fillStyle = "white";
			gm.ctx.font = "16px Arial";
			gm.ctx.fillText(`1st Place: Player ${self.finishedPlayers[0] + 1}`, 100, 100);
			gm.ctx.fillText(`2nd Place: Player ${self.finishedPlayers[1] + 1}`, 100, 130);
		}
	},
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
