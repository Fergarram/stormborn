// SPRITES
create_sprite({
    id: "spr_bowl",
    filepath: "assets/bowl.png",
    frames: 1,
    frame_width: 64,
    frame_height: 64,
    origin_x: 0,
    origin_y: 0
});

create_sprite({
    id: "spr_fish",
    filepath: "assets/fish.png",
    frames: 4,
    frame_width: 12,
    frame_height: 8,
    origin_x: 6,
    origin_y: 4
});

create_sprite({
    id: "spr_bubble",
    filepath: "assets/bub.png",
    frames: 2,
    frame_width: 3,
    frame_height: 3,
    origin_x: 1,
    origin_y: 1
});

// OBJECTS
create_object({
    id: "obj_bowl",
    sprite: "spr_bowl"
});

create_object({
    id: "obj_bubble",
    sprite: "spr_bubble",
    create(self) {
        self.vertical_speed = -0.2 - Math.random() * 0.1;
        self.horizontal_drift = (Math.random() - 0.5) * 0.1;
        
        // Round initial position to integers
        self.x = Math.round(self.x);
        self.y = Math.round(self.y);
        
        // Store sub-pixel position tracking
        self.precise_x = self.x;
        self.precise_y = self.y;
        
        // Random lifetime based on probabilities
        const rand = Math.random();
        if (rand < 0.05) { // 5% chance
            self.lifetime = Math.floor(Math.random() * 6) + 5; // 5-10
        } else if (rand < 0.25) { // 20% chance
            self.lifetime = Math.floor(Math.random() * 25) + 11; // 11-35
        } else if (rand < 0.50) { // 25% chance
            self.lifetime = Math.floor(Math.random() * 31) + 36; // 36-66
        } else if (rand < 0.80) { // 30% chance
            self.lifetime = Math.floor(Math.random() * 7) + 67; // 67-73
        } else if (rand < 0.92) { // 12% chance
            self.lifetime = Math.floor(Math.random() * 11) + 74; // 74-84
        } else { // 8% chance
            self.lifetime = Math.floor(Math.random() * 21) + 85; // 85-105
        }
        
        self.image_index = 0;
        self.image_speed = 0;
        self.frame_delay = 20;
        self.will_change_frame = Math.random() < 0.33;
    },
    step(dt, self) {
        // Stop at water level (8 pixels from top)
        if (self.y < 12) {
            instance_destroy(self);
            return;
        }

        // Update precise positions
        self.precise_y += self.vertical_speed;
        self.precise_x += self.horizontal_drift;
        
        // Round to integers for actual position
        self.x = Math.round(self.precise_x);
        self.y = Math.round(self.precise_y);
        
        // Check if it's time to change frame
        if (self.will_change_frame && self.frame_delay > 0) {
            self.frame_delay--;
            if (self.frame_delay === 0) {
                self.image_index = 1;
            }
        }
        
        self.lifetime--;
        if (self.lifetime <= 0) {
            instance_destroy(self);
        }
    }
});

create_object({
    id: "obj_fish", 
    sprite: "spr_fish",
    create(self) {
        self.x = 32;
        self.y = 32;
        self.base_speed = 0.5;
        self.speed = self.base_speed;
        self.target_x = self.x;
        self.target_y = self.y;
        self.move_timer = 0;
        self.move_delay = 120;
        self.image_speed = 0;
        self.ILLIT = 5;
        self.facing_right = true;
        self.min_move_distance = 6;
        self.target_angle = 0;
        self.angle_lerp_speed = 0.1;
        self.max_angle = 20;
        self.bubble_timer = 0;
        self.bubble_delay = 45; // Frames between bubble spawns
        self.bubble_chance = 0.4; // 40% chance to spawn bubble when timer hits
        self.current_bubble_chance = 0.4;
        self.consecutive_moves = 0;
    },
    step(dt, self) {
        self.move_timer++;
        
        if (self.move_timer >= self.move_delay) {
            // Track consecutive moves
            self.consecutive_moves++;

            // Increase bubble chance with consecutive moves
            self.current_bubble_chance = Math.min(0.9, self.bubble_chance + (self.consecutive_moves * 0.1));

            // Spawn 1-3 bubbles based on movement type
            let bubble_count = 1;
            
            if (self.consecutive_moves > 3 || self.move_delay < 60) {
                bubble_count = Math.floor(Math.random() * 3) + 1;
            }

            // Spawn bubbles
            if (Math.random() < self.current_bubble_chance) {
                for (let i = 0; i < bubble_count; i++) {
                    const mouth_offset = 4;
                    const spawn_x = self.x + (self.facing_right ? mouth_offset : -mouth_offset);
                    const spawn_y = self.y;
                    
                    // Slight delay between multiple bubbles
                    setTimeout(() => {
                        instance_create("obj_bubble", spawn_x, spawn_y);
                    }, i * 100);
                }
            }

            // Randomize speed for new movement
            let rand = Math.random();
            if (rand < 0.6) {
                // Normal speed with slight variation
                self.speed = self.base_speed * (0.8 + Math.random() * 0.4);
            } else {
                // Faster dart
                self.speed = self.base_speed * (1.5 + Math.random() * 0.5);
            }

            // Rest of the original movement code
            let angle = Math.random() * Math.PI * 2;
            rand = Math.random();
            let distance;

            if (rand < 0.50) {
                self.ILLIT = Math.random() * 6 + 6;
                self.move_delay = Math.floor(120 * (Math.random() * 0.2 + 0.1));
            } else {
                self.move_delay = 120;
                
                if (rand < 0.75) {
                    self.ILLIT = Math.random() * 9 + 8;
                } else if (rand < 0.99) {
                    self.ILLIT = Math.random() * 3 + 18;
                } else {
                    self.ILLIT = Math.random() * 3 + 22;   
                }
            }
            
            distance = Math.max(self.min_move_distance, Math.random() * self.ILLIT);
            
            self.target_x = 32 + Math.cos(angle) * distance;
            self.target_y = 32 + Math.sin(angle) * distance;
            
            self.target_y = Math.min(Math.max(self.target_y, 8), 57);
            
            let dx = self.target_x - 32;
            let dy = self.target_y - 32;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 28) {
                self.target_x = 32 + (dx / dist) * 28;
                self.target_y = 32 + (dy / dist) * 28;
            }
            
            self.facing_right = self.target_x > self.x;
            self.image_scale_x = self.facing_right ? -1 : 1;
            
            self.move_timer = 0;
        }

        let dx = self.target_x - self.x;
        let dy = self.target_y - self.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        let current_lerp_speed = dist < 12 ? 
            self.angle_lerp_speed :
            self.angle_lerp_speed * 0.3;

        if (dist > 1) {
            let angle_to_target = Math.atan2(dy, dx) * (180 / Math.PI);
            
            if (!self.facing_right) {
                angle_to_target = -angle_to_target;
            }
            
            self.target_angle = Math.min(Math.max(angle_to_target, -self.max_angle), self.max_angle);
        } else {
            self.target_angle = 0;
        }
        
        let angle_diff = self.target_angle - self.image_angle;
        
        while (angle_diff > 180) angle_diff -= 360;
        while (angle_diff < -180) angle_diff += 360;
        
        self.image_angle += angle_diff * current_lerp_speed;

        if (dist > 1) {
            let move_x = (dx / dist) * self.speed;
            let move_y = (dy / dist) * self.speed;
            
            self.x += move_x;
            self.y += move_y;
        } else {
            self.x = self.target_x;
            self.y = self.target_y;
        }
    }
});

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
    fps: 30,
    bg_color: "transparent",
    setup() {
        return [
            {
                id: "obj_bowl",
                x: 0,
                y: 0
            },
            {
                id: "obj_fish",
                x: 32,
                y: 32
            }
        ];
    },
});

// START THE GAME
window.addEventListener("load", () => {
    run_game(() => {
        room_goto("rm_game");
    });
});