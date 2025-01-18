// CONFIG
const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 240;
const SCALE = 1;

// OBJECTS
create_object({
    id: "obj_paddle",
    collision_mask: { type: "rect", geom: [0, 0, 60, 10] },
    create(self) {
        self.speed = 5;
        instance_ref("paddle", self);
    },
    step(dt, self) {
        if (gm.keydown.ArrowLeft) {
            self.x = Math.max(0, self.x - self.speed);
        }
        if (gm.keydown.ArrowRight) {
            self.x = Math.min(ROOM_WIDTH - 60, self.x + self.speed);
        }
    },
    draw(self) {
        gm.ctx.fillStyle = "#00ff00";
        gm.ctx.fillRect(self.x, self.y, 60, 10);
    }
});

create_object({
    id: "obj_ball",
    collision_mask: { type: "circle", geom: [6] },
    create(self) {
        self.speed_x = 3;
        self.speed_y = -3;
        self.radius = 5;
        instance_ref("ball", self);
    },
    step(dt, self) {
        // Move ball
        self.x += self.speed_x;
        self.y += self.speed_y;

        // Bounce off walls
        if (self.x <= self.radius || self.x >= ROOM_WIDTH - self.radius) {
            self.speed_x *= -1;
            self.x = Math.max(self.radius, Math.min(ROOM_WIDTH - self.radius, self.x));
        }
        if (self.y <= self.radius) {
            self.speed_y *= -1;
            self.y = self.radius;
        }

        // Check if ball is below paddle
        if (self.y > ROOM_HEIGHT) {
            room_restart();
        }

        // Bounce off paddle
        const paddle = instance_ref("paddle");
        if (instances_colliding(self, paddle)) {
            self.speed_y = -Math.abs(self.speed_y);
            self.speed_x += (Math.random() - 0.5) * 2;
            self.y = paddle.y - self.radius;
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
        gm.ctx.arc(self.x, self.y, self.radius, 0, Math.PI * 2);
        gm.ctx.fill();
    }
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
    }
});

// CREATE ROOM
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
    bg_color: "#555555",
    setup() {
        // Create paddle
        instance_create("obj_paddle", 130, 200);

        // Create ball
        instance_create("obj_ball", 160, 180);

        // Create bricks with proper spacing
        const brick_width = 40;
        const brick_height = 15;
        const padding = 5;
        const offset_x = (ROOM_WIDTH - (brick_width + padding) * 7 + padding) / 2;

        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 7; col++) {
                instance_create(
                    "obj_brick", 
                    offset_x + col * (brick_width + padding), 
                    20 + row * (brick_height + padding)
                );
            }
        }

        return [];
    }
});

// START THE GAME
window.addEventListener("load", () => {
	run_game(() => {
		room_goto("rm_game");
	});
});
