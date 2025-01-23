const GRID_WIDTH = 7;
const GRID_HEIGHT = 6;
const VIEWPORT_WIDTH = 700;
const VIEWPORT_HEIGHT = 600;

const BACKGROUND_FRAMES = 11;
const CHIP_FRAMES = 30;

const PREVIEW_ALPHA = 0.305;
const COLOR_CHANGE_COOLDOWN = 15;
const WINNING_LENGTH = 4;
const WIN_HIGHLIGHT_DELAY = 2000;
const CONVERSION_BATCH_SIZE = 3;
const CONVERSION_BATCH_DELAY = 100;
const CONVERSION_CHIP_DELAY = 50;
const INACTIVITY_RESET_MINUTES = 0.66;
const WINNING_ANIMATION_SPEED = 0.5;
const OPACITY_STEP = 0.0078125 * 12.8;
const MIN_OPACITY = 0.0078125;

create_room({
    id: "rm_game",
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    camera: {
        x: 0,
        y: 0,
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
        viewport_width: VIEWPORT_WIDTH,
        viewport_height: VIEWPORT_HEIGHT
    },
    fps: 60,
    bg_color: "#ffffff",
    setup() {
        return [
            {id: "obj_controller"},
            {id: "obj_back", x: 0, y: 0},
            {id: "obj_ground", x: 0, y: 0},
            {id: "obj_preview", x: 0, y: 0, z: 1},
            {id: "obj_sound_controller"},
            {id: "obj_timer"}
        ];
    }
});

create_object({
    id: "obj_timer",
    create(self) {
        self.inactivity_time = 0;
        self.reset_time = INACTIVITY_RESET_MINUTES * 60 * 60;
        self.last_input_time = 0;
        self.controller = instance_get("controller");
    },
    step(dt, self) {
        if(gm.mouse_buttons_pressed[0] || 
           gm.mouse_buttons_pressed[1] || 
           gm.mouse_buttons_pressed[2] ||
           gm.mouse_buttons_pressed[3]) {
            self.inactivity_time = 0;
        }

        self.inactivity_time++;

        if(self.inactivity_time >= self.reset_time) {
            if(has_chips_in_grid(self.controller.columns)) {
                reset_game();
            }
            self.inactivity_time = 0;
        }
    }
});

const SOUNDS = [
    ["snd_place", "assets/place.mp3"],
    ["snd_replace", "assets/replace.mp3"], 
    ["snd_tic", "assets/tic.mp3"],
    ["snd_scroll", "assets/scroll.mp3"],
    ["snd_win", "assets/win.mp3"],
    ["snd_scrub", "assets/scrub.mp3"]
];

SOUNDS.forEach(([id, filepath]) => {
    create_sound({id, filepath});
});

create_object({
    id: "obj_sound_controller",
    create(self) {
        self.click_processed = false;
        self.controller = instance_get("controller");
        self.has_played_win = false;
        self.last_back_index = 0;
        self.last_ground_index = 0;
    },
    step(dt, self) {
        const back = Object.values(room_current().instances)
            .find(inst => inst.object_id === "obj_back");
        const ground = Object.values(room_current().instances)
            .find(inst => inst.object_id === "obj_ground");

        if(back && back.image_index !== self.last_back_index) {
            play_sound("snd_scroll");
            self.last_back_index = back.image_index;
        }
        
        if(ground && ground.image_index !== self.last_ground_index) {
            play_sound("snd_scroll"); 
            self.last_ground_index = ground.image_index;
        }

        if(gm.mouse_buttons_pressed[0] && !self.click_processed) {
            play_sound(self.controller.game_over ? "snd_tic" : "snd_place");
            self.click_processed = true;
        } else if(!gm.mouse_buttons_pressed[0]) {
            self.click_processed = false;
        }

        if(self.controller.game_over && !self.has_played_win) {
            play_sound("snd_win");
            self.has_played_win = true;
        }

        if(!self.controller.game_over) {
            self.has_played_win = false;
        }
    }
});

const SPRITES = [
    ["spr_back", "assets/back.png", BACKGROUND_FRAMES],
    ["spr_ground", "assets/ground.png", BACKGROUND_FRAMES],
    ["spr_chip", "assets/chips.png", CHIP_FRAMES]
];

SPRITES.forEach(([id, filepath, frames]) => {
    create_sprite({
        id,
        filepath,
        frames,
        frame_width: id === "spr_chip" ? 1 : GRID_WIDTH,
        frame_height: id === "spr_chip" ? 1 : GRID_HEIGHT,
        origin_x: 0,
        origin_y: 0
    });
});

create_object({
    id: "obj_back",
    sprite: "spr_back",
    create(self) {
        self.z = -2;
        self.image_speed = 0;
        self.image_index = Math.floor(Math.random() * BACKGROUND_FRAMES);
    }
});

create_object({
    id: "obj_ground",
    sprite: "spr_ground", 
    create(self) {
        self.z = -1;
        self.image_speed = 0;
        self.image_index = Math.floor(Math.random() * BACKGROUND_FRAMES);
    }
});

create_object({
    id: "obj_preview",
    sprite: "spr_chip",
    create(self) {
        self.image_speed = 0;
        self.image_alpha = PREVIEW_ALPHA;
        self.controller = instance_get("controller");
        self.opacity_change_processed = false;
    },
    step(dt, self) {
        const col = Math.max(0, Math.min(GRID_WIDTH - 1, Math.floor(gm.mouse_x)));
        const column = self.controller.columns.get(col) || [];
        const row = GRID_HEIGHT - 1 - column.length;
        self.x = col;
        self.y = row;
        self.image_index = self.controller.player_colors[self.controller.current_turn];
        
        if(gm.mouse_buttons_pressed[4] && !self.opacity_change_processed) {
            self.image_alpha += OPACITY_STEP;
            if(self.image_alpha >= 1) {
                self.image_alpha = MIN_OPACITY;
            }
            self.opacity_change_processed = true;
            play_sound("snd_scroll");
        } else if(!gm.mouse_buttons_pressed[4]) {
            self.opacity_change_processed = false;
        }

        if(self.controller.game_over || row < 0) {
            self.image_alpha = 0;
        }
    }
});

create_object({
    id: "obj_chip",
    sprite: "spr_chip",
    create(self) {
        self.image_speed = 0;
        self.controller = instance_get("controller");
        self.image_alpha = 1;
    }
});

function reset_game() {
    const controller = instance_get("controller");
    play_sound("snd_scrub");
    controller.columns = new Map();
    controller.game_over = false;
    controller.current_turn = 1;
    controller.can_restart = true;
    Object.values(room_current().instances)
        .filter(inst => inst.object_id === "obj_chip")
        .forEach(chip => instance_destroy(chip));
}

function has_chips_in_grid(columns) {
    return Array.from(columns.values()).some(col => col && col.length > 0);
}

create_object({
    id: "obj_controller",
    create(self) {
        self.columns = new Map();
        self.game_over = false;
        self.current_turn = 1;
        self.click_processed = false;
        self.can_restart = true;
        self.player_colors = [0, 1];
        self.color_change_processed = false;
        self.color_change_cooldown = 0;
        self.opacity_change_processed = false;
        self.current_opacity = 1;
        instance_save("controller", self);

        self.handle_scroll = (e) => {
            const back = Object.values(room_current().instances)
                .find(inst => inst.object_id === "obj_back");
            const ground = Object.values(room_current().instances)
                .find(inst => inst.object_id === "obj_ground");

            if(e.deltaY < 0 && back) back.image_index = (back.image_index + 1) % BACKGROUND_FRAMES;
            if(e.deltaY > 0 && ground) ground.image_index = (ground.image_index + 1) % BACKGROUND_FRAMES;
        };

        window.addEventListener('wheel', self.handle_scroll);
    },
    destroy(self) {
        window.removeEventListener('wheel', self.handle_scroll);
    },
    step(dt, self) {
        if(self.color_change_cooldown > 0) self.color_change_cooldown--;

        const chips_are_animating = Object.values(room_current().instances)
            .filter(inst => inst.object_id === "obj_chip")
            .some(chip => chip.image_speed > 0);

        if(gm.mouse_buttons_pressed[3] && !self.opacity_change_processed) {
            self.current_opacity -= OPACITY_STEP;
            if(self.current_opacity <= MIN_OPACITY) {
                self.current_opacity = 1;
            }
            
            Object.values(room_current().instances)
                .filter(inst => inst.object_id === "obj_chip")
                .forEach(chip => {
                    chip.image_alpha = self.current_opacity;
                });
            
            self.opacity_change_processed = true;
            play_sound("snd_scroll");
        } else if(!gm.mouse_buttons_pressed[3]) {
            self.opacity_change_processed = false;
        }

        if(gm.mouse_buttons_pressed[2] && !self.color_change_processed && 
           self.color_change_cooldown <= 0 && !chips_are_animating) {
            self.player_colors[0] = (self.player_colors[0] + 2) % CHIP_FRAMES;
            self.player_colors[1] = (self.player_colors[1] + 2) % CHIP_FRAMES;
            
            Object.values(room_current().instances)
                .filter(inst => inst.object_id === "obj_chip")
                .forEach(chip => {
                    chip.image_speed = 0;
                    chip.image_index = self.player_colors[chip.player];
                });
            
            self.color_change_processed = true;
            self.color_change_cooldown = COLOR_CHANGE_COOLDOWN;
            play_sound("snd_scroll");
        } else if(!gm.mouse_buttons_pressed[2]) {
            self.color_change_processed = false;
        }

        if(gm.mouse_buttons_pressed[1] && self.can_restart && has_chips_in_grid(self.columns)) {
            reset_game();
            return;
        }

        if(gm.mouse_buttons_pressed[0]) {
            self.click_processed = true;
        } else if(self.click_processed) {
            self.click_processed = false;
            const col = Math.floor(gm.mouse_x);
            place_chip(self.current_turn, col);
            self.current_turn = self.current_turn === 1 ? 0 : 1;
        }
    }
});

async function place_chip(player, col) {
    if(col < 0 || col > GRID_WIDTH - 1) return;
    
    const controller = instance_get("controller");
    if(controller.game_over) return;

    if(!controller.columns.has(col)) controller.columns.set(col, []);
    const column = controller.columns.get(col);
    if(column.length >= GRID_HEIGHT) return;

    const row = GRID_HEIGHT - 1 - column.length;
    const chip = instance_create("obj_chip", col, row);
    chip.image_index = controller.player_colors[player];
    chip.player = player;
    chip.image_alpha = controller.current_opacity;
    column.push(chip);

    await check_win(col, row, player);
}

async function check_win(col, row, player) {
    const controller = instance_get("controller");
    const directions = [
        [[0,1], [0,-1]], [[1,0], [-1,0]],
        [[1,1], [-1,-1]], [[1,-1], [-1,1]]
    ];

    for(const [dir1, dir2] of directions) {
        let connected_chips = 1;
        let winning_positions = [[col,row]];
        let found_win = false;

        for(const [dx,dy] of [dir1, dir2]) {
            let x = col + dx, y = row + dy;
            while(x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                const column = controller.columns.get(x) || [];
                const chip = column[GRID_HEIGHT - 1 - y];
                if(!chip || chip.player !== player) break;
                connected_chips++;
                winning_positions.push([x,y]);
                if(connected_chips >= WINNING_LENGTH) {
                    found_win = true;
                    break;
                }
                x += dx;
                y += dy;
            }
            if(found_win) break;
        }

        if(found_win) {
            controller.game_over = true;
            controller.can_restart = false;
            
            winning_positions.forEach(([x,y]) => {
                const chip = controller.columns.get(x)[GRID_HEIGHT - 1 - y];
                chip.image_speed = 1;
                chip.image_index = 2;
            });

            await requeue(WIN_HIGHLIGHT_DELAY);

            const chips_to_convert = [];
            controller.columns.forEach((column, x) => {
                column.forEach((chip, y) => {
                    if(!winning_positions.some(([wx,wy]) => wx === x && wy === GRID_HEIGHT - 1 - y)) {
                        chips_to_convert.push([x, y]);
                    }
                });
            });

            chips_to_convert.sort(() => Math.random() - 0.5);

            for(let i = 0; i < chips_to_convert.length; i += CONVERSION_BATCH_SIZE) {
                const batch = chips_to_convert.slice(i, i + CONVERSION_BATCH_SIZE);
                await Promise.all([
                    ...batch.map(([x, y]) => {
                        return new Promise(resolve => {
                            requestAnimationFrame(async () => {
                                await requeue(Math.random() * CONVERSION_CHIP_DELAY);
                                const chip = controller.columns.get(x)[y];
                                chip.image_speed = 0;
                                chip.image_index = controller.player_colors[player];
                                resolve();
                            });
                        });
                    }),
                    requeue(CONVERSION_BATCH_DELAY).then(() => play_sound("snd_replace"))
                ]);
            }

            winning_positions.forEach(([x,y]) => {
                const chip = controller.columns.get(x)[GRID_HEIGHT - 1 - y];
                chip.image_speed = WINNING_ANIMATION_SPEED;
                chip.cycle_all_frames = true;
            });

            await requeue(WIN_HIGHLIGHT_DELAY);

            winning_positions.forEach(([x,y]) => {
                const chip = controller.columns.get(x)[GRID_HEIGHT - 1 - y];
                chip.image_speed = 0;
                chip.cycle_all_frames = false;
                chip.image_index = controller.player_colors[player];
            });

            controller.can_restart = true;
            return;
        }
    }
}

window.addEventListener("load", () => {
    run_game(() => {
        room_goto("rm_game");
    });
});