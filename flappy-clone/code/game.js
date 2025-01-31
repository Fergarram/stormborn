// GLOBALS
const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 240;
const SCALE = 1;

// SPRITES
create_sprite({
    id: "spr_player",
    filepath: "assets/player.png",
    frames: 6,
    frame_width: 18,
    frame_height: 24,
    origin_x: 9,
    origin_y: 12,
});

create_sprite({
    id: "spr_block",
    filepath: "assets/block.png",
    frames: 1,
    frame_width: 24,
    frame_height: 24,
    origin_x: 0,
    origin_y: 0,
});

// OBJECTS
create_object({
    id: "obj_player",
    sprite: "spr_player",
    collision_mask: { type: "rect", geom: [-9, -12, 18, 24] },
    create(self) {
        self.gravity = 0.5;
        self.jump_force = -7;
        self.vertical_speed = 0;
        self.can_flap = true;
        self.rotation = 0;
        instance_ref("player", self);
        self.controller = instance_ref("controller");
    },
    step(dt, self) {
        if (!self.controller.game_over) {
            // Apply gravity
            self.vertical_speed += self.gravity;

            // Jump when space is pressed
            if (gm.keydown.Space && self.can_flap) {
                self.vertical_speed = self.jump_force;
                self.can_flap = false;
            }

            // Reset can_flap when space is released
            if (!gm.keydown.Space) {
                self.can_flap = true;
            }

            // Update position
            self.y += self.vertical_speed;

            // Rotate player based on vertical speed
            self.rotation = Math.min(Math.max(self.vertical_speed * 3, -30), 90);
            self.image_angle = self.rotation;

            // Animate wings
            self.image_speed = 0.2;

            // Check collisions with blocks
            const blocks = objects_colliding(self, "obj_block");
            if (blocks.length > 0) {
                self.controller.game_over = true;
            }

            // Check if player hits ground or ceiling
            if (self.y > 220 || self.y < 20) {
                self.controller.game_over = true;
            }
        } else {
            // Bird falls when game over
            self.vertical_speed += self.gravity;
            self.y += self.vertical_speed;
            self.image_speed = 0;
        }
    },
});

create_object({
    id: "obj_block",
    sprite: "spr_block",
    collision_mask: { type: "rect", geom: [0, 0, 24, 24] },
    create(self) {
        self.speed = 3;
        self.controller = instance_ref("controller");
        self.score_added = false;
    },
    step(dt, self) {
        if (!self.controller.game_over) {
            // Move block left
            self.x -= self.speed;

            // Remove block when it's off screen
            if (self.x < -60) {
                instance_destroy(self);
            }

            // Add score when block passes player
            const player = instance_ref("player");
            if (player && player.x > self.x + 12 && !self.score_added) {
                self.controller.score++;
                self.score_added = true;
            }
        }
    },
});

create_object({
    id: "obj_controller",
    create(self) {
        self.spawn_timer = 0;
        self.spawn_interval = 90;
        self.score = 0;
        self.game_over = false;
        instance_ref("controller", self);
    },
    step(dt, self) {
        if (!self.game_over) {
            self.spawn_timer++;
            if (self.spawn_timer >= self.spawn_interval) {
                // Create gap position
                const gap_position = Math.random() * 140 + 60; // Between 60 and 200
                const gap_size = 4; // Number of blocks to leave empty for gap

                // Create column of blocks
                for (let i = 0; i < 10; i++) {
                    // Top column
                    if (i < gap_position / 24 - gap_size) {
                        const block = instance_create("obj_block", ROOM_WIDTH, i * 24);
                        block.group_id = self.spawn_timer;
                    }
                }

                for (let i = Math.ceil(gap_position / 24) + 1; i < 10; i++) {
                    // Bottom column
                    const block = instance_create("obj_block", ROOM_WIDTH, i * 24);
                    block.group_id = self.spawn_timer;
                }

                self.spawn_timer = 0;
            }
        } else if (gm.keydown.Space) {
            room_restart();
        }
    },
    draw(self) {
        // Draw score
        gm.ctx.fillStyle = "white";
        gm.ctx.font = "24px Arial";
        gm.ctx.fillText(`Score: ${self.score}`, 10, 30);

        // Draw game over message
        if (self.game_over) {
            gm.ctx.fillStyle = "white";
            gm.ctx.font = "32px Arial";
            gm.ctx.fillText("Game Over!", 100, 100);
            gm.ctx.font = "16px Arial";
            gm.ctx.fillText("Press Space to restart", 90, 130);
        }
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
    bg_color: "#4EC0CA",
    setup() {
        return [
            {
                id: "obj_controller",
                z: 1000,
            },
            {
                id: "obj_player",
                x: 80,
                y: 180,
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