create_object({
    id: "obj_input_tester",
    create(self) {
        // Key tracking
        self.pressed_keys = [];
        self.key_history = [];

        // Mouse tracking
        self.mouse_buttons = [];
        self.mouse_history = [];
        self.mouse_pos = { x: 0, y: 0 };
        self.wheel_history = [];

        // Touch tracking
        self.touches = {};
        self.touch_history = [];

        self.max_history = 100;
        self.column_width = 320;
    },
    maintain_history(self, array) {
        while (array.length > self.max_history) {
            array.pop();
        }
    },
    global_touch_start(self, touch_id, x, y) {
        self.touches[touch_id] = { x, y };
        self.touch_history.unshift(`Touch start: ${Math.round(x)}, ${Math.round(y)}`);
        self.maintain_history(self.touch_history);
    },
    global_touch_move(self, touch_id, x, y) {
        if (self.touches[touch_id]) {
            self.touches[touch_id] = { x, y };
        }
    },
    global_touch_end(self, touch_id, x, y) {
        if (self.touches[touch_id]) {
            self.touch_history.unshift(`Touch end: ${Math.round(x)}, ${Math.round(y)}`);
            delete self.touches[touch_id];
            self.maintain_history(self.touch_history);
        }
    },
    key_pressed(self, key) {
        if (!self.pressed_keys.includes(key)) {
            self.pressed_keys.push(key);
        }
        self.key_history.unshift(`Pressed: ${key}`);
        self.maintain_history(self.key_history);
    },
    key_released(self, key) {
        const index = self.pressed_keys.indexOf(key);
        if (index > -1) {
            self.pressed_keys.splice(index, 1);
        }
        self.key_history.unshift(`Released: ${key}`);
        self.maintain_history(self.key_history);
    },
    global_mouse_wheel(self, delta) {
        const direction = delta > 0 ? "Down" : "Up";
        self.mouse_history.unshift(`Wheel: ${direction}`);
        self.maintain_history(self.mouse_history);
    },
    global_mouse_pressed(self, button) {
        const button_names = ["Left", "Middle", "Right", "Back", "Forward"];
        const button_name = button_names[button] || `Button${button}`;

        if (!self.mouse_buttons.includes(button_name)) {
            self.mouse_buttons.push(button_name);
            self.mouse_history.unshift(`Pressed: ${button_name} Button`);
            self.maintain_history(self.mouse_history);
        }
    },
    global_mouse_released(self, button) {
        const button_names = ["Left", "Middle", "Right", "Back", "Forward"];
        const button_name = button_names[button] || `Button${button}`;

        const index = self.mouse_buttons.indexOf(button_name);
        if (index !== -1) {
            self.mouse_buttons.splice(index, 1);
            self.mouse_history.unshift(`Released: ${button_name} Button`);
            self.maintain_history(self.mouse_history);
        }
    },
    global_mouse_move(self, x, y) {
        self.mouse_pos = { x, y };
    },
    draw(self) {
        gm.ctx.font = "16px monospace";
        gm.ctx.fillStyle = "white";
        const base_y = 30;
        const line_height = 20;

        // Keyboard Column
        gm.ctx.fillText("Currently Held Keys:", 10, base_y);
        const held_text = self.pressed_keys.join(", ") || "None";
        gm.ctx.fillText(held_text, 10, base_y + line_height);

        gm.ctx.fillText("Key History:", 10, base_y + line_height * 3);
        self.key_history.forEach((entry, i) => {
            gm.ctx.fillText(entry, 10, base_y + line_height * (4 + i));
        });

        // Mouse Column
        gm.ctx.fillText(`Mouse Position: ${Math.round(self.mouse_pos.x)}, ${Math.round(self.mouse_pos.y)}`, 
            self.column_width + 20, base_y);

        gm.ctx.fillText("Held Mouse Buttons:", self.column_width + 20, base_y + line_height);
        const mouse_text = self.mouse_buttons.join(", ") || "None";
        gm.ctx.fillText(mouse_text, self.column_width + 20, base_y + line_height * 2);

        gm.ctx.fillText("Mouse History:", self.column_width + 20, base_y + line_height * 4);
        self.mouse_history.forEach((entry, i) => {
            gm.ctx.fillText(entry, self.column_width + 20, base_y + line_height * (5 + i));
        });

        // Draw crosshair
        gm.ctx.strokeStyle = "yellow";
        gm.ctx.lineWidth = 1;
        gm.ctx.beginPath();
        gm.ctx.moveTo(self.mouse_pos.x - 10, self.mouse_pos.y);
        gm.ctx.lineTo(self.mouse_pos.x + 10, self.mouse_pos.y);
        gm.ctx.moveTo(self.mouse_pos.x, self.mouse_pos.y - 10);
        gm.ctx.lineTo(self.mouse_pos.x, self.mouse_pos.y + 10);
        gm.ctx.stroke();

        // Touch Column
        gm.ctx.fillText("Active Touches:", self.column_width * 2 + 20, base_y);
        gm.ctx.fillText(`Count: ${Object.keys(self.touches).length}`, 
            self.column_width * 2 + 20, base_y + line_height);

        gm.ctx.fillText("Touch History:", self.column_width * 2 + 20, base_y + line_height * 3);
        self.touch_history.forEach((entry, i) => {
            gm.ctx.fillText(entry, self.column_width * 2 + 20, base_y + line_height * (4 + i));
        });

        // Draw touch indicators
        Object.entries(self.touches).forEach(([id, touch]) => {
            gm.ctx.beginPath();
            gm.ctx.strokeStyle = "cyan";
            gm.ctx.lineWidth = 2;
            gm.ctx.arc(touch.x, touch.y, 20, 0, Math.PI * 2);
            gm.ctx.stroke();

            gm.ctx.fillStyle = "cyan";
            gm.ctx.fillText(`ID: ${id}`, touch.x - 20, touch.y - 30);
            gm.ctx.fillText(
                `${Math.round(touch.x)}, ${Math.round(touch.y)}`,
                touch.x - 30,
                touch.y + 40
            );
        });
    }
});

create_room({
    id: "rm_game",
    width: window.innerWidth,
    height: window.innerHeight,
	screen: {
		width: window.innerWidth,
		height: window.innerHeight,
		final_width: window.innerWidth,
		final_height: window.innerHeight,
	},
	cameras: [{
		id: "main",
		x: 0,
		y: 0,
		width: window.innerWidth,
		height: window.innerHeight,
		screen_width: window.innerWidth,
		screen_height: window.innerHeight,
		active: true,
	}],
    fps: 60,
    bg_color: "#000",
    setup() {
        return [{
            id: "obj_input_tester"
        }];
    }
});

window.addEventListener("load", () => {
    run_game(() => {
        room_goto("rm_game");
    });
});