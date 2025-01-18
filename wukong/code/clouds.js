create_object({
    id: "obj_clouds",
    create(self) {
        self.spawn_timer = 0;
        self.spawn_interval = 120;
        self.controller = instance_ref("controller");

        // Spawn initial clouds
        const num_initial_clouds = 3;
        for (let i = 0; i < num_initial_clouds; i++) {
            const x = Math.random() * room_current().width;
            const y = Math.random() * 128;
            instance_create("obj_cloud", x, y);
        }
    },
    step(dt, self) {
        if (self.controller.game_over) {
            return;
        }

        self.spawn_timer += 1;

        if (self.spawn_timer >= self.spawn_interval) {
            self.spawn_timer = 0;
            const y = Math.random() * 128;
            instance_create("obj_cloud", room_current().width + 32, y);
        }
    }
});

create_object({
    id: "obj_cloud",
    create(self) {
        self.z = -1;
        const cloud_sprites = ["spr_cloud0", "spr_cloud1", "spr_cloud2", "spr_cloud3", "spr_cloud4", "spr_cloud5"];
        self.sprite = cloud_sprites[Math.floor(Math.random() * cloud_sprites.length)];
        self.speed = 0.5 + Math.random() * 0.5;
        self.y_offset = 0;
        self.y_original = self.y;
        self.y_amplitude = 0.5;
        self.y_frequency = 0.02 + Math.random() * 0.02;
        self.image_alpha = 0.7 + Math.random() * 0.3;
        self.controller = instance_ref("controller");
    },
    step(dt, self) {
        if (self.controller.game_over) {
            return;
        }
        
        self.x -= self.speed;
        self.y_offset = Math.sin(self.x * self.y_frequency) * self.y_amplitude;
        self.y = self.y_original + self.y_offset;

        if (self.x < -32) {
            instance_destroy(self);
        }
    }
});