// CONFIG
const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 576;
const SCALE = 1;

// SPRITES
create_sprite({
    id: "spr_field",
    filepath: "assets/field.png", 
    frames: 1,
    frame_width: 320,
    frame_height: 576,
    origin_x: 0,
    origin_y: 0
});

create_sprite({
    id: "spr_mallet_puck",
    filepath: "assets/mallets,puck.png",
    frames: 5, 
    frame_width: 30,
    frame_height: 30,
    origin_x: 15,
    origin_y: 15
});

// OBJECTS
create_object({
    id: "obj_field",
    sprite: "spr_field",
    create(self) {
        self.z = -1000; // Put in background
    }
});

create_object({
    id: "obj_mallet",
    sprite: "spr_mallet_puck",
    collision_mask: { type: "circle", geom: [15] },
    create(self, props) {
        self.player = props.player;
        self.image_speed = 0;
        self.image_index = props.player === 1 ? 0 : 2;
        self.boundary = {
            min_y: props.player === 1 ? 288 : 0,
            max_y: props.player === 1 ? 576 : 288,
            min_x: 0,
            max_x: 320
        };
        self.target_x = self.x;
        self.target_y = self.y;
        self.move_speed = 15;
    },
    global_touch_start(self, touch_id, x, y) {
        // Check if touch is in mallet's valid area
        if (y >= self.boundary.min_y && y <= self.boundary.max_y) {
            self.touch_id = touch_id;
            self.target_x = x;
            self.target_y = y;
        }
    },
    global_touch_move(self, touch_id, x, y) {
        if (self.touch_id === touch_id) {
            self.target_x = x;
            self.target_y = y;
        }
    },
    global_touch_end(self, touch_id) {
        if (self.touch_id === touch_id) {
            self.touch_id = null;
        }
    },
    step(dt, self) {
        if (self.touch_id !== null) {
            const dx = self.target_x - self.x;
            const dy = self.target_y - self.y;

            self.x += dx * ((self.move_speed * dt) / 1000);
            self.y += dy * ((self.move_speed * dt) / 1000);
        }

        // Constrain position
        self.x = Math.max(self.boundary.min_x, Math.min(self.boundary.max_x, self.x));
        self.y = Math.max(self.boundary.min_y, Math.min(self.boundary.max_y, self.y));
    }
});

create_object({
    id: "obj_puck",
    sprite: "spr_mallet_puck",
    collision_mask: { type: "circle", geom: [11] },
    create(self) {
        self.speed_x = 0;
        self.speed_y = 0;
        self.friction = 0.98;
        self.rebound = 0.8;
        self.image_speed = 0;
        self.image_index = 4;
        self.is_resetting = false;

        self.wall_left = 28 + 11;
        self.wall_right = 320 - (28 + 11);
        self.wall_top = 28 + 11;
        self.wall_bottom = 576 - (28 + 11);
    },
    async reset_position(self) {
        self.is_resetting = true;
        await requeue(1000);
        self.x = 160;
        self.y = 288;
        self.speed_x = 0;
        self.speed_y = 0;
        self.is_resetting = false;
    },
    step(dt, self) {
        self.x += self.speed_x;
        self.y += self.speed_y;

        self.speed_x *= self.friction;
        self.speed_y *= self.friction;

        // Handle mallet collisions
        const hit_mallets = objects_colliding(self, "obj_mallet");
        if (hit_mallets.length > 0) {
            const mallet = hit_mallets[0];
            const angle = point_direction(mallet.x, mallet.y, self.x, self.y);
            const power = 12;

            self.speed_x = Math.cos((angle * Math.PI) / 180) * power;
            self.speed_y = Math.sin((angle * Math.PI) / 180) * power;

            self.x += self.speed_x * 0.5;
            self.y += self.speed_y * 0.5;
        }

        // Wall collisions
        if (self.x < self.wall_left) {
            self.x = self.wall_left;
            self.speed_x = Math.abs(self.speed_x) * self.rebound;
        }
        if (self.x > self.wall_right) {
            self.x = self.wall_right;
            self.speed_x = -Math.abs(self.speed_x) * self.rebound;
        }

        // Goal scoring
        if (!self.is_resetting && (self.y < self.wall_top || self.y > self.wall_bottom)) {
            const goals = objects_colliding(self, "obj_goal");
            if (goals.length > 0 && !self.is_resetting) {
                const goal = goals[0];
                const controller = instance_ref("controller");
                if (goal.player === 1) {
                    controller.score_p2++;
                } else {
                    controller.score_p1++;
                }
                self.reset_position();
            } else {
                if (self.y < self.wall_top) {
                    self.y = self.wall_top;
                    self.speed_y = Math.abs(self.speed_y) * self.rebound;
                }
                if (self.y > self.wall_bottom) {
                    self.y = self.wall_bottom;
                    self.speed_y = -Math.abs(self.speed_y) * self.rebound;
                }
            }
        }

        // Stop if very slow
        if (Math.abs(self.speed_x) < 0.01) self.speed_x = 0;
        if (Math.abs(self.speed_y) < 0.01) self.speed_y = 0;
    }
});

create_object({
    id: "obj_goal",
    collision_mask: { type: "rect", geom: [0, 0, 64, 10] },
    create(self, props) {
        self.player = props.player;
    }
});

create_object({
    id: "obj_controller",
    create(self) {
        self.score_p1 = 0;
        self.score_p2 = 0;
        instance_ref("controller", self);
    },
    draw(self) {
        gm.ctx.fillStyle = "white";
        gm.ctx.font = "48px Arial";
        gm.ctx.textAlign = "center";

        // Player 2 score (top)
        gm.ctx.save();
        gm.ctx.translate(160, 100);
        gm.ctx.rotate(Math.PI);
        gm.ctx.fillText(self.score_p2.toString(), 0, 0);
        gm.ctx.restore();

        // Player 1 score (bottom)
        gm.ctx.fillText(self.score_p1.toString(), 160, 476);
    }
});

// ROOM
create_room({
    id: "rm_game",
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
    screen: {
        width: ROOM_WIDTH,
        height: ROOM_HEIGHT,
        final_width: ROOM_WIDTH * SCALE,
        final_height: ROOM_HEIGHT * SCALE
    },
    fps: 60,
    bg_color: "#000000",
    setup() {
        return [
            {
                id: "obj_field"
            },
            {
                id: "obj_controller"
            },
            {
                id: "obj_mallet",
                x: 160,
                y: 430,
                props: { player: 1 }
            },
            {
                id: "obj_mallet", 
                x: 160,
                y: 146,
                props: { player: 2 }
            },
            {
                id: "obj_goal",
                x: 128,
                y: 20,
                props: { player: 1 }
            },
            {
                id: "obj_goal",
                x: 128,
                y: 546,
                props: { player: 2 }
            },
            {
                id: "obj_puck",
                x: 160,
                y: 288
            }
        ];
    }
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
