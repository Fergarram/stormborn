// CONFIG
const VIEWPORT_WIDTH = 640;
const VIEWPORT_HEIGHT = 480;
const SCALE = 1;
const BLOCK_SIZE = 20;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

// OBJECTS
create_object({
    id: "obj_game_controller",
    create(self) {
        // Generate a long sequence of pieces at start
        self.piece_sequence = Array(10000).fill().map(() => Math.floor(Math.random() * 7));
        instance_ref("controller", self);
    },
});

create_object({
    id: "obj_tetris_board",
    create(self, props) {
        self.grid = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
        self.current_piece = null;
        self.piece_index = 0;
        self.piece_x = 0;
        self.piece_y = 0;
        self.fall_speed = 30;
        self.fall_counter = 0;
        self.game_over = false;
        self.score = 0;
        self.controls = props.controls || {
            left: "",
            right: "",
            down: "",
            rotate: ""
        };
        self.offset_x = props.offset_x || 0;
        self.move_delay = 0;
        self.move_repeat = 4;
        self.controller = instance_ref("controller");

        // Tetris pieces [rotation][y][x]
        self.pieces = [
            [[[1,1,1,1]], [[1],[1],[1],[1]]], // I
            [[[1,1],[1,1]]], // O
            [[[1,1,1],[0,1,0]], [[1,0],[1,1],[1,0]], [[0,1,0],[1,1,1]], [[0,1],[1,1],[0,1]]], // T
            [[[1,1,1],[1,0,0]], [[1,1],[0,1],[0,1]], [[0,0,1],[1,1,1]], [[1,0],[1,0],[1,1]]], // L
            [[[1,1,1],[0,0,1]], [[0,1],[0,1],[1,1]], [[1,0,0],[1,1,1]], [[1,1],[1,0],[1,0]]], // J
            [[[1,1,0],[0,1,1]], [[0,1],[1,1],[1,0]]], // S
            [[[0,1,1],[1,1,0]], [[1,0],[1,1],[0,1]]] // Z
        ];
    },

    key_pressed(self, key) {
        if (self.game_over) return;

        if (key === self.controls.left && self.can_move(-1, 0, self.piece_rotation)) {
            self.piece_x--;
            self.move_delay = 0;
        }
        else if (key === self.controls.right && self.can_move(1, 0, self.piece_rotation)) {
            self.piece_x++;
            self.move_delay = 0;
        }
        else if (key === self.controls.rotate) {
            const new_rotation = (self.piece_rotation + 1) % self.current_piece.length;
            if (self.can_move(0, 0, new_rotation)) {
                self.piece_rotation = new_rotation;
            }
        }
    },

    spawn_piece(self) {
        const piece_type = self.controller.piece_sequence[self.piece_index % self.controller.piece_sequence.length];
        self.current_piece = self.pieces[piece_type];
        self.piece_rotation = 0;
        self.piece_x = Math.floor(BOARD_WIDTH / 2) - 1;
        self.piece_y = 0;

        if (!self.can_move(0, 0, 0)) {
            self.game_over = true;
        }
    },

    can_move(self, dx, dy, rotation) {
        const piece = self.current_piece[rotation];
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    const new_x = self.piece_x + x + dx;
                    const new_y = self.piece_y + y + dy;
                    if (new_x < 0 || new_x >= BOARD_WIDTH || 
                        new_y >= BOARD_HEIGHT ||
                        (new_y >= 0 && self.grid[new_y][new_x])) {
                        return false;
                    }
                }
            }
        }
        return true;
    },

    lock_piece(self) {
        const piece = self.current_piece[self.piece_rotation];
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    const board_y = self.piece_y + y;
                    if (board_y >= 0) {
                        self.grid[board_y][self.piece_x + x] = 1;
                    }
                }
            }
        }
        self.check_lines();
        self.spawn_piece();
        self.piece_index++;
    },

    check_lines(self) {
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (self.grid[y].every(cell => cell === 1)) {
                self.grid.splice(y, 1);
                self.grid.unshift(Array(BOARD_WIDTH).fill(0));
                self.score += 100;
                y++; // Recheck same line
            }
        }
    },

    step(dt, self) {
        if (self.game_over) return;

        if (!self.current_piece) {
            self.spawn_piece();
        }

        // Handle continuous down movement
        if (gm.keydown[self.controls.down] && self.can_move(0, 1, self.piece_rotation)) {
            self.piece_y++;
        }

        // Falling
        self.fall_counter++;
        if (self.fall_counter >= self.fall_speed) {
            self.fall_counter = 0;
            if (self.can_move(0, 1, self.piece_rotation)) {
                self.piece_y++;
            } else {
                self.lock_piece();
            }
        }
    },

    draw(self) {
        // Draw grid
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                gm.ctx.fillStyle = self.grid[y][x] ? "#ffffff" : "#333333";
                gm.ctx.fillRect(
                    self.offset_x + x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        }

        // Draw current piece
        if (self.current_piece && !self.game_over) {
            const piece = self.current_piece[self.piece_rotation];
            gm.ctx.fillStyle = "#ffffff";
            for (let y = 0; y < piece.length; y++) {
                for (let x = 0; x < piece[y].length; x++) {
                    if (piece[y][x]) {
                        gm.ctx.fillRect(
                            self.offset_x + (self.piece_x + x) * BLOCK_SIZE,
                            (self.piece_y + y) * BLOCK_SIZE,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );
                    }
                }
            }
        }

        // Draw score
        gm.ctx.fillStyle = "#ffffff";
        gm.ctx.font = "20px Arial";
        gm.ctx.fillText(`Score: ${self.score}`, self.offset_x, BOARD_HEIGHT * BLOCK_SIZE + 30);

        if (self.game_over) {
            gm.ctx.fillText("Game Over!", self.offset_x, BOARD_HEIGHT * BLOCK_SIZE + 60);
        }
    }
});

// CREATE ROOM
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
    bg_color: "#000000",
    setup() {
        return [
            {
                id: "obj_game_controller"
            },
            {
                id: "obj_tetris_board",
                props: {
                    offset_x: 50,
                    controls: {
                        left: "A",
                        right: "D",
                        down: "S", 
                        rotate: "W"
                    }
                }
            },
            {
                id: "obj_tetris_board", 
                props: {
                    offset_x: 400,
                    controls: {
                        left: "ArrowLeft",
                        right: "ArrowRight", 
                        down: "ArrowDown",
                        rotate: "ArrowUp"
                    }
                }
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