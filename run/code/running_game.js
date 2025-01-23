// CONFIG
const VIEWPORT_WIDTH = 320;
const VIEWPORT_HEIGHT = 288;
const SCALE = 2;

// SPEED MODIFIERS
const KARINA = 3.3; // MAX SPEED
const WINTER = 0.33; // ACCELERATION
const GISELLE = 0.05; // DECELERATION 
const NINGNING = 0.02; // FRICTION

// OBJECTS
create_object({
    id: "obj_background",
    sprite: "spr_background",
    create(self) {
        self.x = 0;
        self.y = 0;
        self.z = -1;
    }
});

create_object({
    id: "obj_player",
    collision_mask: { type: "rect", geom: [0, 0, 32, 48] },
    create(self, props) {
        self.player_number = props.player_number;
        self.keys = props.keys;
        self.color = props.color;
        self.sprite = props.sprite;
        self.x = 0;
        self.y = self.player_number * 48;
        self.speed = 0;
        self.max_speed = KARINA;
        self.expected_key = 0;
        self.image_speed = 0;
        self.finished = false;
        self.acceleration = WINTER;
        self.deceleration = GISELLE;
        self.friction = NINGNING;
        self.animation_speed = 0;
        self.animation_deceleration = 0.1;
    },
    key_pressed(self, key) {
        if (self.finished) return;
        
        if (key === self.keys[self.expected_key]) {
            self.speed = Math.min(self.speed + self.acceleration, self.max_speed);
            self.expected_key = self.expected_key === 0 ? 1 : 0;
            self.animation_speed = self.speed / 2;
        }
    },
    step(dt, self) {
        if (self.finished) return;

        self.speed = Math.max(self.speed - self.deceleration, 0);
        
        if (self.speed > 0) {
            self.speed = Math.max(self.speed - self.friction, 0);
        }

        if (self.animation_speed > 0) {
            self.animation_speed = Math.max(self.animation_speed - self.animation_deceleration, 0);
        }

        self.x += self.speed;
        self.image_speed = self.animation_speed;

        if (self.x > VIEWPORT_WIDTH - 32/3) {
            self.finished = true;
            instance_ref("controller").player_finished(self.player_number);
        }
    }
});

create_object({
    id: "obj_controller",
    create(self) {
        self.player_colors = ["magenta", "red", "blue", "green", "cyan", "yellow"];
        self.player_keys = [
            ["C", "V"],
            ["J", "K"], 
            ["[", "]"],
            ["ArrowLeft", "ArrowDown"],
            ["5", "6"],
            ["1", "2"]
        ];
        self.finished_players = [];
        self.game_ended = false;

        // Shuffle colors
        for (let i = self.player_colors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [self.player_colors[i], self.player_colors[j]] = [self.player_colors[j], self.player_colors[i]];
        }

        // Create players
        for (let i = 0; i < 6; i++) {
            instance_create("obj_player", 0, 0, 0, {
                player_number: i,
                keys: self.player_keys[i],
                color: self.player_colors[i],
                sprite: `spr_${self.player_colors[i]}`
            });
        }

        instance_ref("controller", self);
    },
    player_finished(player_number) {
        this.finished_players.push(player_number);
        if (this.finished_players.length === 2) {
            this.game_ended = true;
        }
    },
    draw(self) {
        if (self.game_ended) {
            gm.ctx.fillStyle = "white";
            gm.ctx.font = "16px Arial";
            gm.ctx.fillText(`1st Place: Player ${self.finished_players[0] + 1}`, 100, 100);
            gm.ctx.fillText(`2nd Place: Player ${self.finished_players[1] + 1}`, 100, 130);
        }
    }
});

// ROOM
create_room({
    id: "rm_game",
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
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
            { id: "obj_controller" },
            { id: "obj_background" }
        ];
    }
});

// START GAME
window.addEventListener("load", () => {
    run_game(() => {
        room_goto("rm_game");
    });
});