
// OBJECTS
create_object({
    id: "obj_ctrl",
    create(self) {
        self.balls_remaining = 15;
        self.black_ball_destroyed = false;
        self.game_over = false;
        self.shots_taken = 0;
        self.show_results = false;
        instance_save("obj_ctrl", self);
    },
    draw(self) {
        if (self.show_results) {
            gm.ctx.fillStyle = "white";
            gm.ctx.font = "12px Arial";
            gm.ctx.textAlign = "center";
            const center_x = 824 / 2;
            const center_y = 472 / 2;

            gm.ctx.font = "12px Arial";
            gm.ctx.fillText(self.balls_remaining > 0 ? "FAIL" : "GAME", center_x, center_y - 36);
            gm.ctx.font = "28px Arial";
            gm.ctx.fillText(`${self.shots_taken} MOVE${self.shots_taken === 1 ? "" : "S"}`, center_x, center_y);
            gm.ctx.font = "12px Arial";
            gm.ctx.fillText('Press "..." to restart', center_x, center_y + 64);
        }
    },
    step(dt, self) {
        if (self.show_results) {
            const keys = ["0", "Space", "*", "#"];
            if (keys.some((key) => gm.keys_pressed[key])) {
                room_restart();
            }
        }
    },
});

create_object({
    id: "obj_ball",
    sprite: "spr_balls",
    collision_mask: { type: "circle", geom: [18] },
    create(self) {
        self.speed_x = 0;
        self.speed_y = 0;
        self.ball_number = 0;
        self.image_speed = 0;
        self.acc_x = 0;
        self.acc_y = 0;
        self.falling = false;
        self.fall_target_x = 0;
        self.fall_target_y = 0;
        self.min_scale = 0.5;
        self.fall_speed = 0.075;
        self.fade_speed = 0.075;
        self.rotation = 0;
        self.angular_velocity = 0;
        self.rotation_friction = 0.98;
        self.spin_factor = 0.2;
        self.friction = 0.98;
        self.movement_threshold = 0.5;
        self.min_speed = 0.01;
        self.bounce_factor = 0.8;
        self.collision_elasticity = 0.95;
    },
    step(dt, self) {
        if (self.falling) {
            const dx = self.fall_target_x - self.x;
            const dy = self.fall_target_y - self.y;
            self.x += dx * self.fall_speed;
            self.y += dy * self.fall_speed;
            self.image_alpha -= self.fade_speed;
            const scale = Math.max(self.min_scale, self.image_alpha);
            self.image_scale_x = scale;
            self.image_scale_y = scale;
            if (self.image_alpha <= 0) {
                instance_destroy(self);
            }
            return;
        }

        self.acc_x += self.speed_x;
        self.acc_y += self.speed_y;

        if (Math.abs(self.acc_x) >= self.movement_threshold) {
            self.x += Math.floor(self.acc_x);
            self.acc_x -= Math.floor(self.acc_x);
        }
        if (Math.abs(self.acc_y) >= self.movement_threshold) {
            self.y += Math.floor(self.acc_y);
            self.acc_y -= Math.floor(self.acc_y);
        }

        self.speed_x *= self.friction;
        self.speed_y *= self.friction;

        if (Math.abs(self.speed_x) < self.min_speed) self.speed_x = 0;
        if (Math.abs(self.speed_y) < self.min_speed) self.speed_y = 0;

        if (self.x < 60 || self.x > 764) {
            self.speed_x *= -self.bounce_factor;
            self.acc_x = 0;
            self.x = Math.min(Math.max(self.x, 60), 764);
            const wall_hit_speed = Math.abs(self.speed_x);
            const volume = Math.max(0.05, Math.min(0.3, wall_hit_speed / 5));
            play_sound("snd_wall", { volume });
        }
        if (self.y < 60 || self.y > 412) {
            self.speed_y *= -self.bounce_factor;
            self.acc_y = 0;
            self.y = Math.min(Math.max(self.y, 60), 412);
            const wall_hit_speed = Math.abs(self.speed_y);
            const volume = Math.max(0.05, Math.min(0.3, wall_hit_speed / 5));
            play_sound("snd_wall", { volume });
        }

        self.rotation += self.angular_velocity;
        self.angular_velocity *= self.rotation_friction;

        const other_balls = objects_colliding(self, "obj_ball");
        for (const other of other_balls) {
            if (other.id === self.id) continue;

            const dx = other.x - self.x;
            const dy = other.y - self.y;
            const dist = point_distance(self.x, self.y, other.x, other.y);

            if (dist < 18) {
                const angle = Math.atan2(dy, dx);
                const overlap = 18 - dist;

                const move_x = Math.floor((Math.cos(angle) * overlap) / 2);
                const move_y = Math.floor((Math.sin(angle) * overlap) / 2);

                self.x -= move_x;
                self.y -= move_y;
                other.x += move_x;
                other.y += move_y;

                self.acc_x = 0;
                self.acc_y = 0;
                other.acc_x = 0;
                other.acc_y = 0;

                const nx = dx / dist;
                const ny = dy / dist;
                const dvx = other.speed_x - self.speed_x;
                const dvy = other.speed_y - self.speed_y;
                const impulse = (dvx * nx + dvy * ny) * self.collision_elasticity;

                const tx = -ny;
                const ty = nx;
                const tv = dvx * tx + dvy * ty;

                self.speed_x += impulse * nx;
                self.speed_y += impulse * ny;
                other.speed_x -= impulse * nx;
                other.speed_y -= impulse * ny;

                self.angular_velocity += tv * self.spin_factor;
                other.angular_velocity -= tv * self.spin_factor;

                const collision_speed = Math.sqrt(dvx * dvx + dvy * dvy);
                const volume = Math.max(0.05, Math.min(0.3, collision_speed / 8));
                play_sound("snd_ball", { volume });
            }
        }

        if (Math.abs(self.speed_x) < 0.1 && Math.abs(self.speed_y) < 0.1) {
            self.angular_velocity *= 0.95;
        }

        if (Math.abs(self.angular_velocity) < 0.01) {
            self.angular_velocity = 0;
        }
    },
});

create_object({
    id: "obj_hole",
    collision_mask: { type: "circle", geom: [18] },
    create(self) {
        self.controller = instance_get("obj_ctrl");
    },
    step(dt, self) {
        const balls = objects_colliding(self, "obj_ball");

        for (const ball of balls) {
            if (ball.falling) continue;

            ball.falling = true;
            ball.fall_target_x = self.x;
            ball.fall_target_y = self.y;
            ball.speed_x = 0;
            ball.speed_y = 0;

            play_sound("snd_hole", { volume: 0.7 });

            if (ball.ball_number === 0) {
                play_sound("snd_lost", { volume: 1.0 });
                self.controller.game_over = true;
                setTimeout(() => {
                    self.controller.show_results = true;
                }, 1000);
                return;
            }

            if (ball.ball_number === 8) {
                if (self.controller.balls_remaining > 1) {
                    play_sound("snd_lost", { volume: 1.0 });
                    self.controller.game_over = true;
                    self.controller.black_ball_destroyed = true;
                    setTimeout(() => {
                        self.controller.show_results = true;
                    }, 1000);
                    return;
                }
            }

            if (ball.ball_number !== 0) {
                self.controller.balls_remaining--;
            }
        }
    },
});
// CUE //
create_object({
    id: "obj_cue",
    sprite: "spr_cue",
    create(self) {
        self.power = 0;
        self.max_power = 17;
        self.pulling = false;
        self.rotation_speed = 1;
        self.target_angle = 0;
        self.base_offset = 464;
        self.pull_scale = 1;
        self.is_shooting = false;
        self.can_apply_physics = false;
        self.show_guide_line = false;
        self.toggle_cooldown = 0;
        self.toggle_cooldown_max = 10;
        self.shoot_distance = 20;
        self.bounce_progress = 0;
        self.bounce_speed = 0.1;
        self.controller = instance_get("obj_ctrl");
    },
    step(dt, self) {
        if (self.toggle_cooldown > 0) {
            self.toggle_cooldown--;
        }

        if ((gm.keys_pressed["*"] || gm.keys_pressed["a"]) && self.toggle_cooldown === 0) {
            self.show_guide_line = !self.show_guide_line;
            self.toggle_cooldown = self.toggle_cooldown_max;
        }

        const white_ball = instance_get("white_ball");
        if (!white_ball) return;

        if (self.controller.game_over) {
            self.image_alpha = 0;
            return;
        }

        const balls_moving = is_any_ball_moving();
        if (balls_moving) {
            self.image_alpha = Math.max(0, self.image_alpha - 0.1);
        } else {
            self.image_alpha = Math.min(1, self.image_alpha + 0.1);

            const rad_angle = (self.target_angle * Math.PI) / 180;
            let offset = self.base_offset;

            if (self.pulling) {
                offset += self.power * self.pull_scale;
            }

            if (self.is_shooting) {
                if (self.bounce_progress < 0.5) {
                    offset -= self.shoot_distance * (self.bounce_progress * 2);
                } else {
                    offset -= self.shoot_distance * ((1 - self.bounce_progress) * 2);
                }

                self.bounce_progress += self.bounce_speed;

                if (self.bounce_progress >= 1) {
                    self.is_shooting = false;
                    self.bounce_progress = 0;
                }
            }

            self.x = white_ball.x - Math.cos(rad_angle) * offset;
            self.y = white_ball.y - Math.sin(rad_angle) * offset;
            self.image_angle = self.target_angle;

            if (self.image_alpha > 0.5) {
                if (gm.keys_pressed["4"] || gm.keys_pressed["2"] || gm.keys_pressed["ArrowLeft"]) {
                    self.target_angle += self.rotation_speed;
                }
                if (gm.keys_pressed["6"] || gm.keys_pressed["8"] || gm.keys_pressed["ArrowRight"]) {
                    self.target_angle -= self.rotation_speed;
                }

                if (gm.keys_pressed["5"] || gm.keys_pressed["ArrowUp"] || gm.keys_pressed["ArrowDown"]) {
                    self.pulling = true;
                    self.power = Math.min(self.power + 0.5, self.max_power);
                } else if (self.pulling) {
                    self.is_shooting = true;
                    self.bounce_progress = 0;
                    self.pulling = false;
                    self.controller.shots_taken++;

                    setTimeout(() => {
                        self.can_apply_physics = true;
                    }, 100);
                }

                if (self.can_apply_physics) {
                    white_ball.speed_x = Math.cos(rad_angle) * self.power;
                    white_ball.speed_y = Math.sin(rad_angle) * self.power;
                    const volume = Math.max(0.1, Math.min(0.5, (self.power / self.max_power) * 0.8));
                    play_sound("snd_hit", { volume });
                    self.power = 0;
                    self.can_apply_physics = false;
                }
            }
        }
    },
    draw(self) {
        const white_ball = instance_get("white_ball");
        if (!white_ball || !self.show_guide_line) return;

        const rad_angle = (self.target_angle * Math.PI) / 180;
        const line_length = 464;
        const start_x = white_ball.x;
        const start_y = white_ball.y;
        const end_x = start_x + Math.cos(rad_angle) * line_length;
        const end_y = start_y + Math.sin(rad_angle) * line_length;

        gm.ctx.beginPath();
        gm.ctx.setLineDash([4, 4]);
        gm.ctx.moveTo(start_x, start_y);
        gm.ctx.lineTo(end_x, end_y);
        gm.ctx.strokeStyle = `#Dfffdf`;
        gm.ctx.lineWidth = 2;
        const current_alpha = gm.ctx.globalAlpha;
        gm.ctx.globalAlpha = self.image_alpha * 0.5;
        gm.ctx.stroke();
        gm.ctx.globalAlpha = current_alpha;
        gm.ctx.setLineDash([]);
    },
});

function is_any_ball_moving() {
    const room = room_current();
    for (const inst_id in room.instances) {
        const inst = room.instances[inst_id];
        if (inst.object_id === "obj_ball") {
            if (Math.abs(inst.speed_x) > 0.01 || Math.abs(inst.speed_y) > 0.01) {
                return true;
            }
        }
    }
    return false;
}

function create_ball(x, y, number) {
    const ball = instance_create("obj_ball", x, y);
    ball.sprite = number === 0 ? "spr_ball_white" : "spr_balls";
    ball.image_index = number;
    ball.ball_number = number;
    return ball;
}
//OBJ FRAME
create_object({
    id: "obj_frame",
    sprite: "spr_wood",
});

create_room({
    id: "rm_game",
    width: 824,
    height: 472,
    fps: 60,
    bg_color: "#000",
    setup() {
        instance_create("obj_ctrl", 0, 0, 1000);

const white_ball = instance_create("obj_ball", 200, 236);
white_ball.sprite = "spr_ball_white";
white_ball.ball_number = 0;
instance_save("white_ball", white_ball);

        const rack_center_x = 600;
        const rack_center_y = 236;
        const ball_spacing = 18;

        const rack_order = [1, 2, 3, 4, 8, 6, 7, 5, 9, 10, 11, 12, 13, 14, 15];
        let ball_index = 0;

        for (let row = 0; row < 5; row++) {
            for (let col = 0; col <= row; col++) {
                if (ball_index < rack_order.length) {
                    const ball_x = Math.round(rack_center_x + row * ball_spacing);
                    const ball_y = Math.round(rack_center_y + (col * ball_spacing - (row * ball_spacing) / 2));
                    create_ball(ball_x, ball_y, rack_order[ball_index]);
                    ball_index++;
                }
            }
        }

const holes = [
    { x: 42, y: 42 },     // Top left
    { x: 412, y: 42 },    // Top middle 
    { x: 782, y: 42 },    // Top right
    { x: 42, y: 430 },    // Bottom left
    { x: 412, y: 430 },   // Bottom middle
    { x: 782, y: 430 }    // Bottom right
];

        for (const pos of holes) {
            instance_create("obj_hole", pos.x, pos.y);
        }

        return [{ id: "obj_frame", z: -1 }, { id: "obj_cue" }];
    },
    camera: {
        x: 0,
        y: 0,
        width: 824,
        height: 472,
        viewport_width: 824,
        viewport_height: 472,
    },
});
// START THE GAME
window.addEventListener("load", () => {
    run_game(() => {
        room_goto("rm_game");
    });
});