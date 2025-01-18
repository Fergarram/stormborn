// GLOBALS
const VIEWPORT_WIDTH = 700;
const VIEWPORT_HEIGHT = 600;

// SOUNDS
create_sound({id: "snd_place", filepath: "assets/place.mp3", volume: 1});
create_sound({id: "snd_replace", filepath: "assets/replace.mp3", volume: 1});
create_sound({id: "snd_tic", filepath: "assets/tic.mp3", volume: 1});
create_sound({id: "snd_scroll", filepath: "assets/scroll.mp3", volume: 1});
create_sound({id: "snd_win", filepath: "assets/win.mp3", volume: 1});
create_sound({id: "snd_scrub", filepath: "assets/scrub.mp3", volume: 1});

// SPRITES
create_sprite({
    id: "spr_back",
    filepath: "assets/back.png",
    frames: 9,
    frame_width: 7,
    frame_height: 6,
    origin_x: 0,
    origin_y: 0
});

create_sprite({
    id: "spr_ground",
    filepath: "assets/ground.png",
    frames: 9,
    frame_width: 7,
    frame_height: 6,
    origin_x: 0,
    origin_y: 0
});

create_sprite({
    id: "spr_chip",
    filepath: "assets/chips.png",
    frames: 3,
    frame_width: 1,
    frame_height: 1,
    origin_x: 0,
    origin_y: 0
});

// OBJECTS
create_object({
    id: "obj_sound_controller",
    create(self) {
        self.mouse_was_down = false;
        self.controller = instance_ref("controller");
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

        if(gm.mousedown[0] && !self.mouse_was_down) {
            play_sound(self.controller.game_over ? "snd_tic" : "snd_place");
            self.mouse_was_down = true;
        } else if(!gm.mousedown[0]) {
            self.mouse_was_down = false;
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

create_object({
    id: "obj_back",
    sprite: "spr_back",
    create(self) {
        self.z = -2;
        self.image_speed = 0;
        self.image_index = Math.floor(Math.random() * 9);
    },
    global_mouse_wheel(self, delta) {
        if (delta < 0) self.image_index = (self.image_index + 1) % 9;
    }
});

create_object({
    id: "obj_ground",
    sprite: "spr_ground", 
    create(self) {
        self.z = -1;
        self.image_speed = 0;
        self.image_index = Math.floor(Math.random() * 9);
    },
    global_mouse_wheel(self, delta) {
        if (delta > 0) self.image_index = (self.image_index + 1) % 9;
    }
});

create_object({
    id: "obj_preview",
    sprite: "spr_chip",
    create(self) {
        self.image_speed = 0;
        self.image_alpha = 0.305;
        self.controller = instance_ref("controller");
    },
    step(dt, self) {
        const col = Math.max(0, Math.min(6, Math.floor(gm.mouse_x)));
        let row = 5;
        while(row >= 0 && self.controller.grid[col][row] !== null) row--;
        self.x = col;
        self.y = row;
        self.image_index = self.controller.current_turn;
        self.image_alpha = (self.controller.game_over || row < 0) ? 0 : 0.305;
    }
});

create_object({
    id: "obj_controller",
    create(self) {
        self.grid = Array(7).fill().map(() => Array(6).fill(null));
        self.game_over = false;
        self.current_turn = 1;
        self.mouse_was_down = false;
        self.can_restart = true;
        instance_ref("controller", self);
    },
    global_mouse_pressed(self, button) {
        console.log(button)
        if(button === 1 && self.can_restart) {
            self.try_restart();
        }
    },
    step(dt, self) {
        if(gm.mousedown[0]) {
            self.mouse_was_down = true;
        } else if(self.mouse_was_down) {
            self.mouse_was_down = false;
            const col = Math.floor(gm.mouse_x);
            self.place_chip(col);
        }
    },
    try_restart(self) {
        let has_chips = false;
        for(let x = 0; x < 7; x++) {
            for(let y = 0; y < 6; y++) {
                if(self.grid[x][y] !== null) {
                    has_chips = true;
                    break;
                }
            }
            if(has_chips) break;
        }

        if(has_chips) {
            play_sound("snd_scrub");
            self.grid = Array(7).fill().map(() => Array(6).fill(null));
            self.game_over = false;
            self.current_turn = 1;
            self.can_restart = true;
            Object.values(room_current().instances)
                .filter(inst => inst.object_id === "obj_chip")
                .forEach(chip => instance_destroy(chip));
        }
    },
    place_chip(self, col) {
        if(col < 0 || col > 6 || self.game_over) return;

        let row = 5;
        while(row >= 0 && self.grid[col][row] !== null) row--;
        if(row < 0) return;

        const chip = instance_create("obj_chip", col, row);
        chip.image_index = self.current_turn;
        self.grid[col][row] = chip;

        self.check_win(col, row);
        self.current_turn = self.current_turn === 1 ? 0 : 1;
    },
    check_win(self, col, row) {
        const directions = [
            [[0,1], [0,-1]], [[1,0], [-1,0]],
            [[1,1], [-1,-1]], [[1,-1], [-1,1]]
        ];

        for(const [dir1, dir2] of directions) {
            let count = 1;
            let winning_chips = [[col,row]];
            const player = self.current_turn;

            for(const [dx,dy] of [dir1, dir2]) {
                let x = col + dx;
                let y = row + dy;
                
                while(x >= 0 && x < 7 && y >= 0 && y < 6 && 
                      self.grid[x][y]?.image_index === player) {
                    count++;
                    winning_chips.push([x,y]);
                    x += dx;
                    y += dy;
                }
            }

            if(count >= 4) {
                self.handle_win(winning_chips, player);
                return;
            }
        }
    },
    handle_win(self, winning_chips, player) {
        self.game_over = true;
        self.can_restart = false;
        
        winning_chips.forEach(([x,y]) => {
            self.grid[x][y].image_index = 2;
            self.grid[x][y].image_speed = 1;
        });

        setTimeout(() => {
            let opponent_chips = [];
            for(let x = 0; x < 7; x++) {
                for(let y = 0; y < 6; y++) {
                    const chip = self.grid[x][y];
                    if(chip && !winning_chips.some(([wx,wy]) => wx === x && wy === y)) {
                        opponent_chips.push([x, y]);
                    }
                }
            }

            opponent_chips.sort(() => Math.random() - 0.5);

            opponent_chips.forEach(([x, y], index) => {
                setTimeout(() => {
                    const chip = self.grid[x][y];
                    chip.image_speed = 0;
                    chip.image_index = player;
                }, index * Math.random() * (100 - 50) + 50);
            });

            for(let i = 0; i < opponent_chips.length; i += 2) {
                setTimeout(() => play_sound("snd_replace"), 
                    i * Math.random() * (200 - 100) + 100);
            }
            
            winning_chips.forEach(([x,y]) => {
                const chip = self.grid[x][y];
                chip.image_speed = 1;
                chip.winning = true;
            });

            setTimeout(() => {
                winning_chips.forEach(([x,y]) => {
                    const chip = self.grid[x][y];
                    chip.image_speed = 0;
                    chip.image_index = player;
                });
                self.can_restart = true;
            }, 2000);
        }, 2000);
    }
});

create_object({
    id: "obj_chip",
    sprite: "spr_chip",
    create(self) {
        self.image_speed = 0;
    }
});

create_room({
    id: "rm_game",
    width: 7,
    height: 6,
    screen: {
        width: 7,
        height: 6,
        final_width: VIEWPORT_WIDTH,
        final_height: VIEWPORT_HEIGHT
    },
    fps: 60,
    bg_color: "#ffffff",
    setup() {
        return [
            {id: "obj_controller"},
            {id: "obj_back", x: 0, y: 0},
            {id: "obj_ground", x: 0, y: 0},
            {id: "obj_preview", x: 0, y: 0, z: 1},
            {id: "obj_sound_controller"}
        ];
    }
});

window.addEventListener("load", () => {
    run_game(() => room_goto("rm_game"));
});