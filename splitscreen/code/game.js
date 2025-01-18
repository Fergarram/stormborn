// GLOBALS
const VIEWPORT_WIDTH = 640;
const VIEWPORT_HEIGHT = 240;
const SCALE = 1;

// OBJECTS
create_object({
    id: "obj_player",
    collision_mask: { type: "circle", geom: [15] },
    create(self, props) {
        self.speed = 4;
        self.player_num = props.player_num;
        self.color = self.player_num === 1 ? "#ff0000" : "#00ff00";
        self.vx = 0;
        self.vy = 0;
        instance_ref(self.player_num === 1 ? "player1" : "player2", self);
    },
    step(dt, self) {
        // Store previous position
        const prev_x = self.x;
        const prev_y = self.y;

        // Update velocity based on player number
        self.vx = 0;
        self.vy = 0;
        
        if (self.player_num === 1) {
            if (gm.keydown.W) self.vy = -self.speed;
            if (gm.keydown.S) self.vy = self.speed;
            if (gm.keydown.A) self.vx = -self.speed;
            if (gm.keydown.D) self.vx = self.speed;
        } else {
            if (gm.keydown.ArrowUp) self.vy = -self.speed;
            if (gm.keydown.ArrowDown) self.vy = self.speed;
            if (gm.keydown.ArrowLeft) self.vx = -self.speed;
            if (gm.keydown.ArrowRight) self.vx = self.speed;
        }

        // Apply velocity one axis at a time
        self.x += self.vx;
        
        // Check collisions on X axis
        const other_player = instance_ref(self.player_num === 1 ? "player2" : "player1");
        if (instances_colliding(self, other_player)) {
            self.x = prev_x;
            const slide_factor = 0.5;
            if (self.vx > 0) {
                other_player.x += self.vx * slide_factor;
            } else if (self.vx < 0) {
                other_player.x += self.vx * slide_factor;
            }
        }

        // Check block collisions on X axis
        const blocks_x = objects_colliding(self, "obj_static_block");
        if (blocks_x.length > 0) {
            self.x = prev_x;
            blocks_x.forEach(block => {
                if (self.vx !== 0) {
                    block.x += self.vx * 0.3;
                }
            });
        }

        // Apply Y movement
        self.y += self.vy;

        // Check collisions on Y axis
        if (instances_colliding(self, other_player)) {
            self.y = prev_y;
            const slide_factor = 0.5;
            if (self.vy > 0) {
                other_player.y += self.vy * slide_factor;
            } else if (self.vy < 0) {
                other_player.y += self.vy * slide_factor;
            }
        }

        // Check block collisions on Y axis
        const blocks_y = objects_colliding(self, "obj_static_block");
        if (blocks_y.length > 0) {
            self.y = prev_y;
            blocks_y.forEach(block => {
                if (self.vy !== 0) {
                    block.y += self.vy * 0.3;
                }
            });
        }
    },
    draw(self) {
        gm.ctx.beginPath();
        gm.ctx.fillStyle = self.color;
        gm.ctx.arc(self.x, self.y, 15, 0, Math.PI * 2);
        gm.ctx.fill();
    },
});

create_object({
    id: "obj_static_block",
    collision_mask: { type: "rect", geom: [0, 0, 40, 40] },
    create(self, props) {
        self.shape_type = props.shape_type;
        self.color = "#303030";
    },
    step(dt, self) {
        const blocks = objects_colliding(self, "obj_static_block");
        blocks.forEach(block => {
            if (block.id !== self.id) {
                const dx = self.x - block.x;
                const dy = self.y - block.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    const separation = 41;
                    if (dist < separation) {
                        const push_strength = 0.1;
                        const overlap = separation - dist;
                        const push_x = (dx / dist) * overlap * push_strength;
                        const push_y = (dy / dist) * overlap * push_strength;
                        
                        self.x += push_x;
                        block.x -= push_x;
                        self.y += push_y;
                        block.y -= push_y;
                    }
                }
            }
        });
    },
    draw(self) {
        gm.ctx.fillStyle = self.color;
        
        if (self.shape_type === "rect") {
            gm.ctx.fillRect(self.x, self.y, 40, 40);
        }
        else if (self.shape_type === "triangle") {
            gm.ctx.beginPath();
            gm.ctx.moveTo(self.x, self.y + 40);
            gm.ctx.lineTo(self.x + 20, self.y);
            gm.ctx.lineTo(self.x + 40, self.y + 40);
            gm.ctx.closePath();
            gm.ctx.fill();
        }
        else if (self.shape_type === "circle") {
            gm.ctx.beginPath();
            gm.ctx.arc(self.x + 20, self.y + 20, 20, 0, Math.PI * 2);
            gm.ctx.fill();
        }
        else if (self.shape_type === "polygon") {
            gm.ctx.beginPath();
            gm.ctx.moveTo(self.x + 20, self.y);
            gm.ctx.lineTo(self.x + 40, self.y + 20);
            gm.ctx.lineTo(self.x + 30, self.y + 40);
            gm.ctx.lineTo(self.x + 10, self.y + 40);
            gm.ctx.lineTo(self.x, self.y + 20);
            gm.ctx.closePath();
            gm.ctx.fill();
        }
    },
});

create_object({
    id: "obj_cam1",
    create(self) {
        self.target = instance_ref("player1");
    },
    step(dt, self) {
        self.x = self.target.x;
        self.y = self.target.y;
    }
});

create_object({
    id: "obj_cam2",
    create(self) {
        self.target = instance_ref("player2");
    },
    step(dt, self) {
        self.x = self.target.x;
        self.y = self.target.y;
    }
});

// CREATE ROOM
create_room({
    id: "rm_game",
    width: VIEWPORT_WIDTH * 2, // arbitrary size
    height: VIEWPORT_HEIGHT * 2, // arbitrary size
    screen: {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        final_width: VIEWPORT_WIDTH * SCALE,
        final_height: VIEWPORT_HEIGHT * SCALE
    },
    fps: 60,
    bg_color: "#555555",
    setup() {
        return [
            {
                id: "obj_player",
                x: 100,
                y: 120,
                props: { player_num: 1 }
            },
            {
                id: "obj_player",
                x: 540,
                y: 120,
                props: { player_num: 2 }
            },
            {
                id: "obj_cam1",
                x: 0,
                y: 0
            },
            {
                id: "obj_cam2",
                x: 0,
                y: 0
            },
            {
                id: "obj_static_block",
                x: 200,
                y: 100,
                props: { shape_type: "rect" }
            },
            {
                id: "obj_static_block",
                x: 400,
                y: 150,
                props: { shape_type: "polygon" }
            },
            {
                id: "obj_static_block",
                x: 300,
                y: 200,
                props: { shape_type: "circle" }
            },
            {
                id: "obj_static_block",
                x: 150,
                y: 300,
                props: { shape_type: "triangle" }
            },
            {
                id: "obj_static_block",
                x: 450,
                y: 250,
                props: { shape_type: "rect" }
            }
        ];
    },
    cameras: [
        {
            id: "camera1",
            x: 0,
            y: 0,
            screen_width: VIEWPORT_WIDTH / 2,
            screen_height: VIEWPORT_HEIGHT,
            screen_x: 0,
            screen_y: 0,
            follow: {
                target: "obj_cam1"
            },
            active: true
        },
        {
            id: "camera2", 
            x: 0,
            y: 0,
            screen_width: VIEWPORT_WIDTH / 2,
            screen_height: VIEWPORT_HEIGHT,
            screen_x: VIEWPORT_WIDTH / 2,
            screen_y: 0,
            follow: {
                target: "obj_cam2"
            },
            active: true
        }
    ]
});

// START THE GAME
window.addEventListener("load", () => {
    run_game(() => {
        room_goto("rm_game");
    });
});