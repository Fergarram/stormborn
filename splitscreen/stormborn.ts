const VERSION = "pre-0.6.0";

type SB_Config = {
	title: string;
	description: string;
	image_smoothing_enabled: boolean;
	container: HTMLElement | null;
	debug?: boolean;
	culling_enabled?: boolean;
	shape_smoothing_enabled?: boolean;
};

type SB_Game = {
	config: SB_Config | null;
	canvas: HTMLCanvasElement | null;
	ctx: CanvasRenderingContext2D;
	keydown: { [key: string]: boolean };
	mouse_x: number;
	mouse_y: number;
	touch_points: Record<number, { x: number; y: number }>;
	mousedown: { [button: number]: boolean };
	current_room: string | null;
	running: boolean;
	audio_context: AudioContext;
	audio_master_gain: GainNode;
	objects: Record<string, SB_Object>;
	sprites: Record<string, SB_Sprite>;
	rooms: Record<string, SB_Room>;
	tile_layers: Record<string, SB_TileLayer>;
	images: Record<string, HTMLImageElement>;
	sounds: Record<string, SB_Sound>;
};

type SB_Sprite = {
	id: string;
	frames: number;
	frame_width: number;
	frame_height: number;
	origin_x: number;
	origin_y: number;
	filepath: string;
};

type SB_Sound = {
	id: string;
	filepath: string;
	volume: number;
	buffer: AudioBuffer | null;
	source: AudioBufferSourceNode | null;
};

type SB_Method = (self: SB_Instance, ...args: any[]) => any;

type SB_Object = {
	id: string;
	collision_mask: SB_Mask;
	tile_layer: string | null;
	sprite: string | null;
	setup?: (obj_id: string) => void;
	create?: (self: SB_Instance, props?: {}) => void;
	destroy?: (self: SB_Instance) => void;
	step?: (dt: number, self: SB_Instance) => void;
	draw?: (self: SB_Instance) => void;
	mouse_over?: (self: SB_Instance) => void;
	mouse_out?: (self: SB_Instance) => void;
	mouse_down?: (self: SB_Instance) => void;
	mouse_up?: (self: SB_Instance) => void;
	mouse_wheel?: (self: SB_Instance, delta: number) => void;
	key_pressed?: (self: SB_Instance, key: string) => void;
	key_released?: (self: SB_Instance, key: string) => void;
	global_mouse_pressed?: (self: SB_Instance, button: number) => void;
	global_mouse_released?: (self: SB_Instance, button: number) => void;
	global_mouse_wheel?: (self: SB_Instance, delta: number) => void;
	global_mouse_move?: (self: SB_Instance, mouse_x: number, mouse_y: number) => void;
	global_touch_start?: (self: SB_Instance, touch_id: number, x: number, y: number) => void;
	global_touch_move?: (self: SB_Instance, touch_id: number, x: number, y: number) => void;
	global_touch_end?: (self: SB_Instance, touch_id: number, x: number, y: number) => void;
	animation_end?: (self: SB_Instance) => void;
	room_start?: (self: SB_Instance) => void;
	room_end?: (self: SB_Instance) => void;
	[key: string]: SB_Method | any;
};

type SB_Instance = {
	id: string;
	object_id: string;
	x: number;
	y: number;
	z: number;
	collision_mask: SB_Mask;
	tile_layer: string | null;
	sprite: string | null;
	is_culled?: boolean;
	direction: number;
	image_index: number;
	image_speed: number;
	image_scale_x: number;
	image_scale_y: number;
	image_angle: number;
	image_width: number;
	image_height: number;
	image_alpha: number;
	image_clock: number;
};

type SB_Camera = {
	id: string;
	x: number;
	y: number;
	screen_width: number;
	screen_height: number;
	screen_x: number;
	screen_y: number;
	follow?: {
		target: string;
		offset_x?: number;
		offset_y?: number;
	};
	active: boolean;
};

type SB_Room = {
	id: string;
	width: number;
	height: number;
	screen: {
		width: number;
		height: number;
		final_width: number;
		final_height: number;
	};
	fps: number;
	bg_color: string;
	setup: () => {
		id: string;
		x?: number;
		y?: number;
		z?: number;
		mask?: SB_Mask;
		props?: {};
	}[];
	instances: Record<string, SB_Instance>;
	instance_refs: Record<string, string>;
	object_index: Record<string, string[]>;
	cameras: SB_Camera[];
};

type SB_TileLayer = {
	id: string;
	cols: number;
	rows: number;
	grid_size: number;
	tiles: {
		sprite: string;
		frame_index: number;
		x: number;
		y: number;
	}[];
	image?: ImageBitmap;
};

type SB_Mask = {
	type: "circle" | "rect" | "polygon";
	geom: number[];
};

function create_game(config: SB_Config) {
	// Default config values

	if (config.culling_enabled === undefined) {
		config.culling_enabled = true;
	}

	if (config.shape_smoothing_enabled === undefined) {
		config.shape_smoothing_enabled = true;
	}

	const gm: SB_Game = {
		config,
		canvas: null,
		running: false,
		keydown: {},
		mousedown: {},
		mouse_x: 0,
		mouse_y: 0,
		touch_points: {},
		current_room: null,
		ctx: {} as CanvasRenderingContext2D,
		audio_context: new (window.AudioContext || (window as any).webkitAudioContext)(),
		audio_master_gain: null as unknown as GainNode,
		objects: {},
		sprites: {},
		rooms: {},
		tile_layers: {},
		sounds: {},
		images: {},
	};

	// Initialize audio
	gm.audio_master_gain = gm.audio_context.createGain();
	gm.audio_master_gain.connect(gm.audio_context.destination);

	let last_frame_time = 0;
	const device_pixel_ratio = window.devicePixelRatio || 1;

	async function run_game(start_callback: (gm: SB_Game) => void) {
		if (!gm.config || !gm.config.container) {
			console.error("Game container element not found");
			return;
		}

		gm.running = true;

		// Set up canvas
		const canvas = document.createElement("canvas");
		gm.config.container.appendChild(canvas);
		gm.ctx = canvas.getContext("2d")!;
		gm.canvas = canvas;

		if (!gm.config.image_smoothing_enabled) {
			canvas.style.imageRendering = "pixelated";
		}

		// Set up event listeners
		window.addEventListener("keydown", (e) => {
			if (!gm.running || !gm.current_room) return;
			if (e.key === "CapsLock") return;
			const k = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
			gm.keydown[k] = true;

			// Call key_pressed method on all instances
			const room = gm.rooms[gm.current_room];
			Object.values(room.instances).forEach((instance) => {
				const obj = gm.objects[instance.object_id];
				if (obj.key_pressed) {
					obj.key_pressed(instance, k);
				}
			});
		});

		window.addEventListener("keyup", (e) => {
			if (!gm.running || !gm.current_room) return;
			if (e.key === "CapsLock") return;
			const k = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
			gm.keydown[k] = false;

			// Call key_released method on all instances
			const room = gm.rooms[gm.current_room];
			Object.values(room.instances).forEach((instance) => {
				const obj = gm.objects[instance.object_id];
				if (obj.key_released) {
					obj.key_released(instance, k);
				}
			});
		});

		canvas.addEventListener("contextmenu", (e) => {
			e.preventDefault();
		});

		canvas.addEventListener("mousemove", (e) => {
			e.preventDefault();

			if (!gm.running || !gm.current_room) return;

			const rect = canvas.getBoundingClientRect();
			const mouse_x = e.clientX - rect.left;
			const mouse_y = e.clientY - rect.top;

			const width_scale = gm.rooms[gm.current_room].screen.final_width / gm.rooms[gm.current_room].screen.width;
			const height_scale = gm.rooms[gm.current_room].screen.final_height / gm.rooms[gm.current_room].screen.height;

			gm.mouse_x = mouse_x / width_scale;
			gm.mouse_y = mouse_y / height_scale;

			// Call global_mouse_move on all instances
			const room = gm.rooms[gm.current_room];
			Object.values(room.instances).forEach((instance) => {
				const obj = gm.objects[instance.object_id];
				if (obj.global_mouse_move) {
					obj.global_mouse_move(instance, gm.mouse_x, gm.mouse_y);
				}
			});
		});

		canvas.addEventListener("mousedown", (e) => {
			e.preventDefault();

			if (!gm.running || !gm.current_room) return;
			gm.mousedown[e.button] = true;

			// Call global_mouse_pressed on all instances
			const room = gm.rooms[gm.current_room];
			Object.values(room.instances).forEach((instance) => {
				const obj = gm.objects[instance.object_id];
				if (obj.global_mouse_pressed) {
					obj.global_mouse_pressed(instance, e.button);
				}
			});
		});

		canvas.addEventListener("mouseup", (e) => {
			e.preventDefault();

			if (!gm.running || !gm.current_room) return;
			gm.mousedown[e.button] = false;

			// Call global_mouse_released on all instances
			const room = gm.rooms[gm.current_room];
			Object.values(room.instances).forEach((instance) => {
				const obj = gm.objects[instance.object_id];
				if (obj.global_mouse_released) {
					obj.global_mouse_released(instance, e.button);
				}
			});
		});

		canvas.addEventListener("wheel", (e) => {
			e.preventDefault();

			if (!gm.running || !gm.current_room) return;

			const delta = Math.sign(e.deltaY);
			const room = gm.rooms[gm.current_room];

			// Call global_mouse_wheel on all instances
			Object.values(room.instances).forEach((instance) => {
				const obj = gm.objects[instance.object_id];
				if (obj.global_mouse_wheel) {
					obj.global_mouse_wheel(instance, delta);
				}

				// Check if mouse is over this instance and call instance-specific mouse_wheel
				if (obj.mouse_wheel && point_in_instance(instance, gm.mouse_x, gm.mouse_y)) {
					obj.mouse_wheel(instance, delta);
				}
			});
		});

		canvas.addEventListener("touchstart", (e) => {
			e.preventDefault();
			if (!gm.running || !gm.current_room) return;

			const rect = canvas.getBoundingClientRect();
			const width_scale = gm.rooms[gm.current_room].screen.final_width / gm.rooms[gm.current_room].screen.width;
			const height_scale = gm.rooms[gm.current_room].screen.final_height / gm.rooms[gm.current_room].screen.height;

			Array.from(e.changedTouches).forEach((touch) => {
				const touch_x = (touch.clientX - rect.left) / width_scale;
				const touch_y = (touch.clientY - rect.top) / height_scale;

				gm.touch_points[touch.identifier] = { x: touch_x, y: touch_y };

				// Call global_touch_start on all instances
				const room = gm.rooms[gm.current_room!];
				Object.values(room.instances).forEach((instance) => {
					const obj = gm.objects[instance.object_id];
					if (obj.global_touch_start) {
						obj.global_touch_start(instance, touch.identifier, touch_x, touch_y);
					}
				});
			});
		});

		canvas.addEventListener("touchmove", (e) => {
			e.preventDefault();
			if (!gm.running || !gm.current_room) return;

			const rect = canvas.getBoundingClientRect();
			const width_scale = gm.rooms[gm.current_room].screen.final_width / gm.rooms[gm.current_room].screen.width;
			const height_scale = gm.rooms[gm.current_room].screen.final_height / gm.rooms[gm.current_room].screen.height;

			Array.from(e.changedTouches).forEach((touch) => {
				const touch_x = (touch.clientX - rect.left) / width_scale;
				const touch_y = (touch.clientY - rect.top) / height_scale;

				gm.touch_points[touch.identifier] = { x: touch_x, y: touch_y };

				// Call global_touch_move on all instances
				const room = gm.rooms[gm.current_room!];
				Object.values(room.instances).forEach((instance) => {
					const obj = gm.objects[instance.object_id];
					if (obj.global_touch_move) {
						obj.global_touch_move(instance, touch.identifier, touch_x, touch_y);
					}
				});
			});
		});

		canvas.addEventListener("touchend", (e) => {
			e.preventDefault();
			if (!gm.running || !gm.current_room) return;

			Array.from(e.changedTouches).forEach((touch) => {
				const touch_point = gm.touch_points[touch.identifier];
				if (!touch_point) return;

				// Call global_touch_end on all instances
				const room = gm.rooms[gm.current_room!];
				Object.values(room.instances).forEach((instance) => {
					const obj = gm.objects[instance.object_id];
					if (obj.global_touch_end) {
						obj.global_touch_end(instance, touch.identifier, touch_point.x, touch_point.y);
					}
				});

				// Remove the touch point from tracking
				delete gm.touch_points[touch.identifier];
			});
		});

		canvas.addEventListener("touchcancel", (e) => {
			e.preventDefault();
			if (!gm.running || !gm.current_room) return;

			Array.from(e.changedTouches).forEach((touch) => {
				const touch_point = gm.touch_points[touch.identifier];
				if (!touch_point) return;

				// Call global_touch_end on all instances
				const room = gm.rooms[gm.current_room!];
				Object.values(room.instances).forEach((instance) => {
					const obj = gm.objects[instance.object_id];
					if (obj.global_touch_end) {
						obj.global_touch_end(instance, touch.identifier, touch_point.x, touch_point.y);
					}
				});

				// Remove the touch point from tracking
				delete gm.touch_points[touch.identifier];
			});
		});

		// Setup the game
		Object.values(gm.objects).forEach((obj) => {
			if (obj.setup) {
				obj.setup(obj.id);
			}
		});

		// Load all images and sounds
		const asset_promises = [
			...Object.values(gm.sprites).map((sprite) => {
				const img = new Image();
				img.src = sprite.filepath;
				return new Promise((resolve) => {
					img.onload = () => {
						gm.images[sprite.id] = img;
						resolve(undefined);
					};
				});
			}),
			...Object.values(gm.sounds).map((sound) => {
				return fetch(sound.filepath)
					.then((response) => response.arrayBuffer())
					.then((array_buffer) => gm.audio_context.decodeAudioData(array_buffer))
					.then((audio_buffer) => {
						sound.buffer = audio_buffer;
					})
					.catch((error) => {
						console.error(`Error loading sound ${sound.id}:`, error);
					});
			}),
		];

		async function render_tile_layers(layer: SB_TileLayer): Promise<ImageBitmap> {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d")!;
			canvas.width = layer.cols * layer.grid_size;
			canvas.height = layer.rows * layer.grid_size;

			for (const tile of layer.tiles) {
				const sprite = gm.sprites[tile.sprite];
				const image = gm.images[tile.sprite];

				if (!sprite || !image) {
					console.error(`Sprite ${tile.sprite} not found for tile layer ${layer.id}`);
					continue;
				}

				const source_x = tile.frame_index * sprite.frame_width;
				const source_y = 0;

				if (!gm.config) {
					throw new Error("Game config not found");
				}

				ctx.imageSmoothingEnabled = gm.config.image_smoothing_enabled;
				gm.ctx.imageSmoothingQuality = gm.config.image_smoothing_enabled ? "high" : "low";

				ctx.drawImage(
					image,
					source_x,
					source_y,
					sprite.frame_width,
					sprite.frame_height,
					tile.x * layer.grid_size,
					tile.y * layer.grid_size,
					sprite.frame_width,
					sprite.frame_height,
				);
			}

			const image_data = ctx.getImageData(0, 0, layer.cols * layer.grid_size, layer.rows * layer.grid_size);
			return await createImageBitmap(image_data);
		}

		function game_loop(timestamp: number): void {
			if (!gm.running || !gm.config || !gm.current_room) {
				requestAnimationFrame(game_loop);
				return;
			}

			const room = gm.rooms[gm.current_room];
			const frame_interval = 1000 / (room.fps * 2);

			if (timestamp - last_frame_time >= frame_interval) {
				const dt = timestamp - last_frame_time;
				last_frame_time = timestamp;

				gm.ctx.imageSmoothingEnabled = gm.config.image_smoothing_enabled;
				gm.ctx.imageSmoothingQuality = gm.config.image_smoothing_enabled ? "high" : "low";
				if (!gm.config.shape_smoothing_enabled) {
					gm.ctx.filter =
						"url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxmaWx0ZXIgaWQ9ImZpbHRlciIgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIj48ZmVDb21wb25lbnRUcmFuc2Zlcj48ZmVGdW5jUiB0eXBlPSJpZGVudGl0eSIvPjxmZUZ1bmNHIHR5cGU9ImlkZW50aXR5Ii8+PGZlRnVuY0IgdHlwZT0iaWRlbnRpdHkiLz48ZmVGdW5jQSB0eXBlPSJkaXNjcmV0ZSIgdGFibGVWYWx1ZXM9IjAgMSIvPjwvZmVDb21wb25lbnRUcmFuc2Zlcj48L2ZpbHRlcj48L3N2Zz4=#filter)";
				}

				// Clear the entire canvas
				gm.ctx.clearRect(0, 0, gm.canvas!.width, gm.canvas!.height);

				// Draw room bg color
				gm.ctx.fillStyle = room.bg_color;
				gm.ctx.fillRect(0, 0, gm.canvas!.width, gm.canvas!.height);

				// Sort instances by z-index once
				const sorted_instances = Object.values(room.instances).sort((a, b) => a.z - b.z);

				// Update all instances first
				for (const instance of sorted_instances) {
					const obj = gm.objects[instance.object_id];

					if (obj.step) {
						obj.step(dt, instance);
					}

					// Handle mouse events
					const mouse_over = point_in_instance(instance, gm.mouse_x, gm.mouse_y);
					if (mouse_over && obj.mouse_over) obj.mouse_over(instance);
					else if (!mouse_over && obj.mouse_out) obj.mouse_out(instance);
					if (mouse_over) {
						if (gm.mousedown[0] && obj.mouse_down) obj.mouse_down(instance);
						if (!gm.mousedown[0] && obj.mouse_up) obj.mouse_up(instance);
					}

					if (obj.animation_end && animation_ended(instance)) {
						obj.animation_end(instance);
					}
				}

				// Draw for each active camera
				room.cameras.forEach((camera) => {
					if (!camera.active) return;

					// Update camera if following target
					update_camera_position(camera, room);

					// Set up camera view
					gm.ctx.save();

					// Scale for device pixel ratio
					gm.ctx.scale(device_pixel_ratio, device_pixel_ratio);

					// Move to camera's canvas position
					gm.ctx.translate(camera.screen_x, camera.screen_y);

					// Apply camera transform
					gm.ctx.translate(-camera.x, -camera.y);

					// Create clipping region for camera
					gm.ctx.beginPath();
					gm.ctx.rect(camera.x, camera.y, camera.screen_width, camera.screen_height);
					gm.ctx.clip();

					// Draw all visible instances
					for (const instance of sorted_instances) {
						if (instance.sprite) {
							draw_sprite(instance, camera);
						} else if (instance.tile_layer) {
							draw_layer(instance);
						}

						const obj = gm.objects[instance.object_id];
						if (obj.draw) {
							obj.draw(instance);
						}

						if (gm.config && gm.config.debug) {
							draw_collision_mask(instance);
						}
					}

					gm.ctx.restore();
				});
			}

			requestAnimationFrame(game_loop);
		}

		// Start the game
		Promise.all(asset_promises)
			.then(() => {
				// Now that all sprites are loaded, render tile layers
				return Promise.all(
					Object.values(gm.tile_layers).map((layer) =>
						render_tile_layers(layer).then((image_data) => {
							layer.image = image_data;
						}),
					),
				);
			})
			.then(() => {
				requestAnimationFrame(game_loop);
				start_callback(gm);
			});
	}

	function create_object(obj: Partial<SB_Object>) {
		if (!obj.id) {
			throw new Error("Object ID is required");
		}

		// Separate methods from other properties
		const methods: Record<string, SB_Method> = {};
		const properties: Partial<SB_Object> = {};

		// Loop through all keys in the object
		Object.entries(obj).forEach(([key, value]) => {
			if (
				typeof value === "function" &&
				key !== "setup" &&
				key !== "create" &&
				key !== "destroy" &&
				key !== "step" &&
				key !== "draw" &&
				key !== "mouse_over" &&
				key !== "mouse_out" &&
				key !== "mouse_down" &&
				key !== "mouse_up" &&
				key !== "mouse_wheel" &&
				key !== "key_pressed" &&
				key !== "key_released" &&
				key !== "global_mouse_pressed" &&
				key !== "global_mouse_released" &&
				key !== "global_mouse_wheel" &&
				key !== "global_mouse_move" &&
				key !== "global_touch_start" &&
				key !== "global_touch_move" &&
				key !== "global_touch_end" &&
				key !== "animation_end" &&
				key !== "room_start" &&
				key !== "room_end"
			) {
				// It's a custom method
				methods[key] = value as SB_Method;
			} else {
				// It's a regular property or lifecycle method
				properties[key] = value;
			}
		});

		const default_obj: SB_Object = {
			id: "",
			collision_mask: { type: "rect", geom: [0, 0, 0, 0] },
			tile_layer: null,
			sprite: null,
		};

		// Modify the create method to attach methods to the instance
		const original_create = properties.create;
		properties.create = (instance: SB_Instance, props?: {}) => {
			// Attach all custom methods to the instance
			Object.entries(methods).forEach(([key, method]) => {
				instance[key] = (...args: any[]) => method(instance, ...args);
			});

			// Call the original create method if it exists
			if (original_create) {
				original_create(instance, props);
			}
		};

		const merged_obj = { ...default_obj, ...properties };
		gm.objects[merged_obj.id] = merged_obj;
	}

	function create_sound(sound: Partial<SB_Sound>) {
		if (!sound.id) {
			throw new Error("Sound ID is required");
		}

		if (!sound.filepath) {
			throw new Error("Sound filepath is required");
		}

		const default_sound: SB_Sound = {
			id: "",
			filepath: "",
			volume: 1,
			buffer: null,
			source: null,
		};

		const merged_sound = { ...default_sound, ...sound };
		gm.sounds[merged_sound.id] = merged_sound;
	}

	function create_sprite(sprite: Partial<SB_Sprite>) {
		if (!sprite.id) {
			throw new Error("Sprite ID is required");
		}

		if (!sprite.filepath) {
			throw new Error("Sprite filepath is required");
		}

		const default_sprite: SB_Sprite = {
			id: "",
			frames: 1,
			frame_width: 0,
			frame_height: 0,
			origin_x: 0,
			origin_y: 0,
			filepath: "",
		};

		const merged_sprite = { ...default_sprite, ...sprite };

		gm.sprites[merged_sprite.id] = merged_sprite;
	}

	function create_room(room: Partial<SB_Room>) {
		if (!room.id) {
			throw new Error("Room ID is required");
		}

		const default_room: SB_Room = {
			id: "",
			width: 800,
			height: 600,
			screen: {
				width: 800,
				height: 600,
				final_width: 800,
				final_height: 600,
			},
			fps: 60,
			bg_color: "#000000",
			setup: () => [],
			instances: {},
			instance_refs: {},
			object_index: {},
			cameras: [],
		};

		if (room.width && room.height && !room.screen) {
			room.screen = {
				width: room.width,
				height: room.height,
				final_width: room.width,
				final_height: room.height,
			};
		}

		const camera = camera_create({
			id: unique_id(),
			screen_width: default_room.width,
			screen_height: default_room.height,
			active: true,
		});
		default_room.cameras.push(camera);

		const merged_room = { ...default_room, ...room };
		gm.rooms[merged_room.id] = merged_room;
	}

	function create_layer(layer: Partial<SB_TileLayer>) {
		if (!layer.id) {
			throw new Error("Layer ID is required");
		}

		const default_layer: SB_TileLayer = {
			id: "",
			cols: 0,
			rows: 0,
			grid_size: 32,
			tiles: [],
		};

		const merged_layer = { ...default_layer, ...layer };
		gm.tile_layers[merged_layer.id] = merged_layer;
	}

	//
	// Internals
	//

	function update_camera_position(camera: SB_Camera, room: SB_Room): void {
		if (!camera.follow) return;

		const inst_id = room.object_index[camera.follow.target]?.[0];
		const target = room.instances[inst_id];

		if (!target) {
			console.error(`Camera target object not found: ${camera.follow.target}`);
			return;
		}

		const offset_x = camera.follow.offset_x || 0;
		const offset_y = camera.follow.offset_y || 0;

		// Calculate target position
		let target_x = target.x - camera.screen_width / 2 + offset_x;
		let target_y = target.y - camera.screen_height / 2 + offset_y;

		camera.x = target_x;
		camera.y = target_y;
	}

	function draw_collision_mask(instance: SB_Instance): void {
		const ctx = gm.ctx;
		ctx.save();
		ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
		ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
		ctx.lineWidth = 2;

		if (instance.collision_mask.type === "polygon") {
			const vertices = instance.collision_mask.geom;
			ctx.beginPath();
			ctx.moveTo(instance.x + vertices[0], instance.y + vertices[1]);
			for (let i = 2; i < vertices.length; i += 2) {
				ctx.lineTo(instance.x + vertices[i], instance.y + vertices[i + 1]);
			}
			ctx.closePath();
			ctx.stroke();
			ctx.fill();
		} else if (instance.collision_mask.type === "rect") {
			const [mx, my, mw, mh] = instance.collision_mask.geom;
			ctx.strokeRect(instance.x + mx, instance.y + my, mw, mh);
			ctx.fillRect(instance.x + mx, instance.y + my, mw, mh);
		} else if (instance.collision_mask.type === "circle") {
			const [radius] = instance.collision_mask.geom;
			ctx.beginPath();
			ctx.arc(instance.x, instance.y, radius, 0, Math.PI * 2);
			ctx.stroke();
			ctx.fill();
		}

		ctx.restore();
	}

	function draw_sprite(instance: SB_Instance, camera: SB_Camera): void {
		if (!instance.sprite || !gm.sprites[instance.sprite]) {
			return;
		}

		const image = gm.images[instance.sprite];
		const sprite = gm.sprites[instance.sprite];
		const ctx = gm.ctx;

		// Only perform culling if enabled in config
		if (gm.config && gm.config.culling_enabled) {
			// Calculate actual dimensions after scaling
			const final_width = sprite.frame_width * Math.abs(instance.image_scale_x);
			const final_height = sprite.frame_height * Math.abs(instance.image_scale_y);
			const scaled_origin_x = sprite.origin_x * Math.abs(instance.image_scale_x);
			const scaled_origin_y = sprite.origin_y * Math.abs(instance.image_scale_y);
			const bounds = {
				left: instance.x - scaled_origin_x,
				right: instance.x - scaled_origin_x + final_width,
				top: instance.y - scaled_origin_y,
				bottom: instance.y - scaled_origin_y + final_height,
			};

			// Cull if completely outside camera view
			if (
				bounds.right < camera.x ||
				bounds.left > camera.x + camera.screen_width ||
				bounds.bottom < camera.y ||
				bounds.top > camera.y + camera.screen_height
			) {
				instance.is_culled = true;
				return;
			}
		}

		instance.is_culled = false;
		instance.image_clock += 1;

		if (sprite.frames > 1 && instance.image_speed !== 0) {
			// Image speed is how many frames to wait before changing the image_index
			if (instance.image_clock >= instance.image_speed) {
				instance.image_index += 1;
				instance.image_clock = 0;
			}
		}

		if (instance.image_index >= sprite.frames) {
			instance.image_index = 0;
		}

		const source_x = instance.image_index * sprite.frame_width;
		const source_y = 0;

		ctx.save();
		ctx.translate(instance.x, instance.y);
		ctx.rotate((instance.image_angle * Math.PI) / 180);
		ctx.scale(instance.image_scale_x, instance.image_scale_y);
		ctx.globalAlpha = instance.image_alpha;
		ctx.drawImage(
			image,
			source_x,
			source_y,
			sprite.frame_width,
			sprite.frame_height,
			-sprite.origin_x,
			-sprite.origin_y,
			sprite.frame_width,
			sprite.frame_height,
		);
		ctx.restore();
	}

	function draw_layer(instance: SB_Instance): void {
		if (!instance.tile_layer) return;

		const layer = gm.tile_layers[instance.tile_layer];
		if (!layer || !layer.image) return;

		gm.ctx.save();

		gm.ctx.translate(instance.x, instance.y);
		gm.ctx.rotate((instance.image_angle * Math.PI) / 180);
		gm.ctx.scale(instance.image_scale_x, instance.image_scale_y);
		gm.ctx.globalAlpha = instance.image_alpha;

		gm.ctx.drawImage(layer.image, 0, 0, layer.cols * layer.grid_size, layer.rows * layer.grid_size);

		gm.ctx.restore();
	}

	//
	// Game Utils
	//

	function camera_create(config: Partial<SB_Camera>): SB_Camera {
		const default_camera: SB_Camera = {
			id: unique_id(),
			x: 0,
			y: 0,
			screen_width: 800,
			screen_height: 600,
			screen_x: 0,
			screen_y: 0,
			active: true,
		};

		return { ...default_camera, ...config };
	}

	function instances_colliding(a: SB_Instance, b: SB_Instance): boolean {
		if (!a || !b) return false;

		// Transform polygon vertices based on instance position
		function transform_vertices(instance: SB_Instance, vertices: number[]): number[] {
			const transformed: number[] = [];
			for (let i = 0; i < vertices.length; i += 2) {
				transformed.push(instance.x + vertices[i]);
				transformed.push(instance.y + vertices[i + 1]);
			}
			return transformed;
		}

		if (a.collision_mask.type === "polygon" && b.collision_mask.type === "polygon") {
			const vertices1 = transform_vertices(a, a.collision_mask.geom);
			const vertices2 = transform_vertices(b, b.collision_mask.geom);
			return polygons_intersect(vertices1, vertices2);
		} else if (a.collision_mask.type === "rect" && b.collision_mask.type === "rect") {
			const [ax, ay, aw, ah] = a.collision_mask.geom;
			const [bx, by, bw, bh] = b.collision_mask.geom;
			return !(
				a.x + ax + aw < b.x + bx ||
				a.x + ax > b.x + bx + bw ||
				a.y + ay + ah < b.y + by ||
				a.y + ay > b.y + by + bh
			);
		} else if (a.collision_mask.type === "circle" && b.collision_mask.type === "circle") {
			const [ar] = a.collision_mask.geom;
			const [br] = b.collision_mask.geom;
			const distance = point_distance(a.x, a.y, b.x, b.y);
			return distance < ar + br;
		} else if (
			(a.collision_mask.type === "rect" && b.collision_mask.type === "circle") ||
			(a.collision_mask.type === "circle" && b.collision_mask.type === "rect")
		) {
			// Handle rect vs circle collision
			let rect_instance: SB_Instance;
			let circle_instance: SB_Instance;

			if (a.collision_mask.type === "rect") {
				rect_instance = a;
				circle_instance = b;
			} else {
				rect_instance = b;
				circle_instance = a;
			}

			const [rx, ry, rw, rh] = rect_instance.collision_mask.geom;
			const [radius] = circle_instance.collision_mask.geom;

			return rect_circle_intersect(
				rect_instance.x + rx,
				rect_instance.y + ry,
				rw,
				rh,
				circle_instance.x,
				circle_instance.y,
				radius,
			);
		} else if (a.collision_mask.type === "polygon" || b.collision_mask.type === "polygon") {
			// Handle polygon collisions with other shapes
			let polygon_instance: SB_Instance;
			let other_instance: SB_Instance;

			if (a.collision_mask.type === "polygon") {
				polygon_instance = a;
				other_instance = b;
			} else {
				polygon_instance = b;
				other_instance = a;
			}

			const vertices = transform_vertices(polygon_instance, polygon_instance.collision_mask.geom);

			if (other_instance.collision_mask.type === "rect") {
				const [rx, ry, rw, rh] = other_instance.collision_mask.geom;
				const rect_vertices = [
					other_instance.x + rx,
					other_instance.y + ry,
					other_instance.x + rx + rw,
					other_instance.y + ry,
					other_instance.x + rx + rw,
					other_instance.y + ry + rh,
					other_instance.x + rx,
					other_instance.y + ry + rh,
				];
				return polygons_intersect(vertices, rect_vertices);
			} else if (other_instance.collision_mask.type === "circle") {
				const [radius] = other_instance.collision_mask.geom;
				return polygon_circle_intersect(vertices, other_instance.x, other_instance.y, radius);
			}
		}

		return false;
	}

	function objects_colliding(instance: SB_Instance, obj_id: string): SB_Instance[] {
		const room = gm.rooms[gm.current_room!];
		const colliding_instances: SB_Instance[] = [];

		if (!instance) return colliding_instances;

		// Use object_index to get instances of the specified object type
		const potential_collisions = room.object_index[obj_id] || [];

		for (const other_id of potential_collisions) {
			const other = room.instances[other_id];
			if (instances_colliding(instance, other)) {
				colliding_instances.push(other);
			}
		}

		return colliding_instances;
	}

	function instance_ref(key: string, instance?: SB_Instance): SB_Instance | undefined {
		const room = gm.rooms[gm.current_room!];

		if (instance === undefined) {
			// Get mode
			return room.instances[room.instance_refs[key]];
		} else {
			// Set mode
			room.instance_refs[key] = instance.id;
			return instance;
		}
	}

	function instance_unref(key: string): void {
		const room = gm.rooms[gm.current_room!];
		delete room.instance_refs[key];
	}

	function instance_create(obj_id: string, x?: number, y?: number, z?: number, props?: {}): SB_Instance {
		const room = gm.rooms[gm.current_room!];
		const obj = gm.objects[obj_id];
		if (!obj) throw new Error(`Object with id ${obj_id} not found`);

		let sprite_info = { width: 0, height: 0 };
		if (obj.sprite) {
			if (!gm.sprites[obj.sprite]) throw new Error(`Sprite with id ${obj.sprite} not found`);
			const spr = gm.sprites[obj.sprite];
			sprite_info = { width: spr.frame_width, height: spr.frame_height };
		}

		const instance: SB_Instance = {
			id: unique_id(),
			object_id: obj_id,
			x: x || 0,
			y: y || 0,
			z: z || 0,
			collision_mask: obj.collision_mask,
			tile_layer: obj.tile_layer,
			sprite: obj.sprite,
			image_index: 0,
			direction: 0,
			image_speed: 1,
			image_scale_x: 1,
			image_scale_y: 1,
			image_angle: 0,
			image_width: sprite_info.width,
			image_height: sprite_info.height,
			image_alpha: 1,
			image_clock: 0,
		};

		room.instances[instance.id] = instance;

		// Update object_index
		if (!room.object_index[obj_id]) {
			room.object_index[obj_id] = [];
		}
		room.object_index[obj_id].push(instance.id);

		if (obj.create) {
			obj.create(instance, props);
		}

		return instance;
	}

	function instance_count(obj_id: string): number {
		const room = gm.rooms[gm.current_room!];
		return (room.object_index[obj_id] || []).length;
	}

	function instance_destroy(instance: SB_Instance): boolean {
		const room = gm.rooms[gm.current_room!];
		if (instance.id in room.instances) {
			const obj = gm.objects[instance.object_id];
			if (obj.destroy) {
				obj.destroy(instance);
			}

			delete room.instances[instance.id];

			// Update object_index
			const index = room.object_index[instance.object_id].findIndex((i) => i === instance.id);
			if (index !== -1) {
				room.object_index[instance.object_id].splice(index, 1);
			}

			return true;
		}
		return false;
	}
	function instance_exists(instance: SB_Instance): boolean {
		const room = gm.rooms[gm.current_room!];
		return instance.id in room.instances;
	}

	function point_in_instance(instance: SB_Instance, x: number, y: number): boolean {
		if (instance.collision_mask.type === "polygon") {
			const transformed_vertices: number[] = [];
			const vertices = instance.collision_mask.geom;
			for (let i = 0; i < vertices.length; i += 2) {
				transformed_vertices.push(instance.x + vertices[i]);
				transformed_vertices.push(instance.y + vertices[i + 1]);
			}
			return point_in_polygon(x, y, transformed_vertices);
		} else if (instance.collision_mask.type === "rect") {
			const [mx, my, mw, mh] = instance.collision_mask.geom;
			return x >= instance.x + mx && x <= instance.x + mx + mw && y >= instance.y + my && y <= instance.y + my + mh;
		} else if (instance.collision_mask.type === "circle") {
			const [radius] = instance.collision_mask.geom;
			return point_distance(x, y, instance.x, instance.y) <= radius;
		}
		return false;
	}

	function animation_ended(instance: SB_Instance): boolean {
		if (!instance || !instance.sprite) {
			return false;
		}

		const sprite = gm.sprites[instance.sprite];
		return instance.image_index === sprite.frames - 1;
	}

	function play_sound(sound_id: string, opts = { volume: 1, loop: false }) {
		const sound = gm.sounds[sound_id];
		if (!sound || !sound.buffer) {
			console.error(`Sound ${sound_id} not found or not loaded`);
			return;
		}

		// Stop the current playback if any
		if (sound.source) {
			sound.source.stop();
		}

		// Create a new source
		sound.source = gm.audio_context.createBufferSource();
		sound.source.buffer = sound.buffer;
		sound.source.loop = opts.loop;

		// Create a gain node for this sound
		const gain_node = gm.audio_context.createGain();
		gain_node.gain.value = sound.volume;

		// Connect the source to the gain node and the gain node to the master gain
		sound.source.connect(gain_node);
		gain_node.connect(gm.audio_master_gain);

		// Start playing
		sound.source.start(0);
	}

	function stop_sound(sound_id: string) {
		const sound = gm.sounds[sound_id];
		if (sound && sound.source) {
			sound.source.stop();
			sound.source = null;
		}
	}

	function sound_volume(sound_id: string, volume: number) {
		const sound = gm.sounds[sound_id];
		if (sound) {
			sound.volume = Math.max(0, Math.min(1, volume));
			if (sound.source) {
				const gain_node = gm.audio_context.createGain();
				gain_node.gain.value = sound.volume;
				sound.source.connect(gain_node);
				gain_node.connect(gm.audio_master_gain);
			}
		}
	}

	function master_volume(volume: number) {
		gm.audio_master_gain.gain.value = Math.max(0, Math.min(1, volume));
	}

	function room_goto(room_id: string): void {
		if (!gm.rooms[room_id]) throw new Error(`Room with id ${room_id} not found`);
		if (!gm.canvas) throw new Error("Canvas not initialized");

		// Run room end event for current room
		if (gm.current_room) {
			call_objects_room_end(gm.current_room);
		}

		gm.current_room = room_id;
		const room = gm.rooms[room_id];
		last_frame_time = 0;

		// Clear existing instances
		room.instances = {};
		room.instance_refs = {};
		room.object_index = {};

		// Set canvas dimensions based on room settings
		gm.canvas.width = room.screen.width * device_pixel_ratio;
		gm.canvas.height = room.screen.height * device_pixel_ratio;
		gm.canvas.style.width = `${room.screen.final_width}px`;
		gm.canvas.style.height = `${room.screen.final_height}px`;

		// Initialize new room
		room.setup().forEach((item) => {
			const init = {
				x: 0,
				y: 0,
				z: 0,
				props: {},
			};
			if (item.x !== undefined) init.x = item.x;
			if (item.y !== undefined) init.y = item.y;
			if (item.z !== undefined) init.z = item.z;
			if (item.props !== undefined) init.props = item.props;
			const instance = instance_create(item.id, item.x, item.y, item.z, item.props);
			if (item.mask !== undefined) instance.collision_mask = item.mask;
		});

		// Run room start event
		call_objects_room_start(room_id);
	}

	async function room_restart() {
		if (!gm.current_room) {
			throw new Error("No room is currently active");
		}

		await requeue();

		room_goto(gm.current_room);
	}

	function room_current() {
		return gm.current_room ? gm.rooms[gm.current_room] : null;
	}

	function call_objects_room_start(room_id: string): void {
		const room = gm.rooms[room_id];
		Object.values(room.instances).forEach((instance) => {
			const obj = gm.objects[instance.object_id];
			if (obj.room_start) {
				obj.room_start(instance);
			}
		});
	}

	function call_objects_room_end(room_id: string): void {
		const room = gm.rooms[room_id];
		Object.values(room.instances).forEach((instance) => {
			const obj = gm.objects[instance.object_id];
			if (obj.room_end) {
				obj.room_end(instance);
			}
		});
	}

	return {
		gm,
		create_object,
		create_sprite,
		create_room,
		create_layer,
		create_sound,
		run_game,
		room_goto,
		room_restart,
		room_current,
		play_sound,
		stop_sound,
		sound_volume,
		master_volume,
		instance_ref,
		instance_unref,
		instances_colliding,
		instance_create,
		instance_count,
		instance_destroy,
		instance_exists,
		objects_colliding,
		animation_ended,
	};
}

//
// General Utils
//

function requeue(time = 0) {
	return new Promise((resolve) => setTimeout(resolve, time));
}

function unique_id() {
	return crypto.randomUUID();
}

//
// Math Utils
//

function point_distance(x1: number, y1: number, x2: number, y2: number): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	return Math.sqrt(dx * dx + dy * dy);
}

function point_direction(x1: number, y1: number, x2: number, y2: number): number {
	return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}

function point_in_polygon(x: number, y: number, vertices: number[]): boolean {
	let inside = false;
	const len = vertices.length;

	for (let i = 0, j = len - 2; i < len; j = i, i += 2) {
		const xi = vertices[i];
		const yi = vertices[i + 1];
		const xj = vertices[j];
		const yj = vertices[j + 1];

		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}

	return inside;
}

function rect_circle_intersect(
	rect_x: number,
	rect_y: number,
	rect_width: number,
	rect_height: number,
	circle_x: number,
	circle_y: number,
	circle_radius: number,
): boolean {
	// Find the closest point on the rectangle to the circle's center
	const closest_x = Math.max(rect_x, Math.min(circle_x, rect_x + rect_width));
	const closest_y = Math.max(rect_y, Math.min(circle_y, rect_y + rect_height));

	// Calculate the distance between the closest point and the circle's center
	const distance_x = circle_x - closest_x;
	const distance_y = circle_y - closest_y;
	const distance_squared = distance_x * distance_x + distance_y * distance_y;

	return distance_squared <= circle_radius * circle_radius;
}

function circle_line_segment_intersect(
	circle_x: number,
	circle_y: number,
	circle_radius: number,
	line_x1: number,
	line_y1: number,
	line_x2: number,
	line_y2: number,
): boolean {
	// Vector from line start to circle center
	const ac_x = circle_x - line_x1;
	const ac_y = circle_y - line_y1;

	// Vector from line start to line end
	const ab_x = line_x2 - line_x1;
	const ab_y = line_y2 - line_y1;

	// Length of line segment squared
	const ab_squared = ab_x * ab_x + ab_y * ab_y;

	// Project circle center onto line segment
	const t = Math.max(0, Math.min(1, (ac_x * ab_x + ac_y * ab_y) / ab_squared));

	// Point on line closest to circle center
	const closest_x = line_x1 + t * ab_x;
	const closest_y = line_y1 + t * ab_y;

	// Distance from closest point to circle center
	const distance = point_distance(circle_x, circle_y, closest_x, closest_y);

	return distance <= circle_radius;
}

function polygon_circle_intersect(vertices: number[], circle_x: number, circle_y: number, circle_radius: number): boolean {
	// First check if circle center is inside polygon
	if (point_in_polygon(circle_x, circle_y, vertices)) {
		return true;
	}

	// Then check if circle intersects with any of the polygon's edges
	for (let i = 0; i < vertices.length; i += 2) {
		const next = (i + 2) % vertices.length;
		const x1 = vertices[i];
		const y1 = vertices[i + 1];
		const x2 = vertices[next];
		const y2 = vertices[next + 1];

		if (circle_line_segment_intersect(circle_x, circle_y, circle_radius, x1, y1, x2, y2)) {
			return true;
		}
	}

	return false;
}

function line_segments_intersect(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3: number,
	y3: number,
	x4: number,
	y4: number,
): boolean {
	const denominator = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
	if (denominator === 0) return false;

	const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
	const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

	return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function polygons_intersect(vertices1: number[], vertices2: number[]): boolean {
	// First check if any point from either polygon is inside the other
	for (let i = 0; i < vertices1.length; i += 2) {
		if (point_in_polygon(vertices1[i], vertices1[i + 1], vertices2)) {
			return true;
		}
	}

	for (let i = 0; i < vertices2.length; i += 2) {
		if (point_in_polygon(vertices2[i], vertices2[i + 1], vertices1)) {
			return true;
		}
	}

	// Then check if any lines intersect
	for (let i = 0; i < vertices1.length; i += 2) {
		const next1 = (i + 2) % vertices1.length;
		const x1 = vertices1[i];
		const y1 = vertices1[i + 1];
		const x2 = vertices1[next1];
		const y2 = vertices1[next1 + 1];

		for (let j = 0; j < vertices2.length; j += 2) {
			const next2 = (j + 2) % vertices2.length;
			const x3 = vertices2[j];
			const y3 = vertices2[j + 1];
			const x4 = vertices2[next2];
			const y4 = vertices2[next2 + 1];

			if (line_segments_intersect(x1, y1, x2, y2, x3, y3, x4, y4)) {
				return true;
			}
		}
	}

	return false;
}

export default {
	VERSION,
	create_game,
	point_distance,
	point_direction,
	unique_id,
	requeue,
	point_in_polygon,
	rect_circle_intersect,
	circle_line_segment_intersect,
	polygon_circle_intersect,
	line_segments_intersect,
	polygons_intersect,
};
