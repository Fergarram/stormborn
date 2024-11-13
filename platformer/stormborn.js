// stormborn.ts
function create_game(config) {
  const gm = {
    config,
    canvas: null,
    running: false,
    keys_pressed: {},
    mouse_buttons_pressed: {},
    mouse_x: 0,
    mouse_y: 0,
    current_room: null,
    ctx: {},
    audio_context: new (window.AudioContext || window.webkitAudioContext),
    audio_master_gain: null,
    objects: {},
    sprites: {},
    rooms: {},
    tile_layers: {},
    sounds: {},
    images: {}
  };
  gm.audio_master_gain = gm.audio_context.createGain();
  gm.audio_master_gain.connect(gm.audio_context.destination);
  let last_frame_time = 0;
  const device_pixel_ratio = window.devicePixelRatio || 1;
  function run_game(start_callback) {
    if (!gm.config || !gm.config.container) {
      console.error("Game container element not found");
      return;
    }
    gm.running = true;
    const canvas = document.createElement("canvas");
    gm.config.container.appendChild(canvas);
    gm.ctx = canvas.getContext("2d");
    gm.canvas = canvas;
    if (!gm.config.image_smoothing_enabled) {
      canvas.style.imageRendering = "pixelated";
    }
    window.addEventListener("keydown", (e) => {
      if (!gm.running)
        return;
      const k = e.key === " " ? "Space" : e.key;
      gm.keys_pressed[k] = true;
    });
    window.addEventListener("keyup", (e) => {
      if (!gm.running)
        return;
      const k = e.key === " " ? "Space" : e.key;
      gm.keys_pressed[k] = false;
    });
    canvas.addEventListener("mousemove", (e) => {
      if (!gm.running || !gm.current_room)
        return;
      const rect = canvas.getBoundingClientRect();
      const room = gm.rooms[gm.current_room];
      const camera = room.camera;
      const scale_x = camera.width / camera.viewport_width;
      const scale_y = camera.height / camera.viewport_height;
      const mouse_x = (e.clientX - rect.left) * scale_x;
      const mouse_y = (e.clientY - rect.top) * scale_y;
      gm.mouse_x = mouse_x;
      gm.mouse_y = mouse_y;
    });
    canvas.addEventListener("mousedown", (e) => {
      if (!gm.running || !gm.current_room)
        return;
      const rect = canvas.getBoundingClientRect();
      const room = gm.rooms[gm.current_room];
      const camera = room.camera;
      const scale_x = camera.width / camera.viewport_width;
      const scale_y = camera.height / camera.viewport_height;
      const mouse_x = (e.clientX - rect.left) * scale_x + camera.x;
      const mouse_y = (e.clientY - rect.top) * scale_y + camera.y;
      gm.mouse_buttons_pressed[e.button] = true;
    });
    canvas.addEventListener("mouseup", (e) => {
      if (!gm.running || !gm.current_room)
        return;
      const rect = canvas.getBoundingClientRect();
      const room = gm.rooms[gm.current_room];
      const camera = room.camera;
      const scale_x = camera.width / camera.viewport_width;
      const scale_y = camera.height / camera.viewport_height;
      const mouse_x = (e.clientX - rect.left) * scale_x + camera.x;
      const mouse_y = (e.clientY - rect.top) * scale_y + camera.y;
      gm.mouse_buttons_pressed[e.button] = false;
    });
    Object.values(gm.objects).forEach((obj) => {
      if (obj.setup) {
        obj.setup(obj.id);
      }
    });
    const asset_promises = [
      ...Object.values(gm.sprites).map((sprite) => {
        const img = new Image;
        img.src = sprite.filepath;
        return new Promise((resolve) => {
          img.onload = () => {
            gm.images[sprite.id] = img;
            resolve(undefined);
          };
        });
      }),
      ...Object.values(gm.sounds).map((sound) => {
        return fetch(sound.filepath).then((response) => response.arrayBuffer()).then((array_buffer) => gm.audio_context.decodeAudioData(array_buffer)).then((audio_buffer) => {
          sound.buffer = audio_buffer;
        }).catch((error) => {
          console.error(`Error loading sound ${sound.id}:`, error);
        });
      })
    ];
    async function render_tile_layers(layer) {
      const canvas2 = document.createElement("canvas");
      const ctx = canvas2.getContext("2d");
      canvas2.width = layer.cols * layer.grid_size;
      canvas2.height = layer.rows * layer.grid_size;
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
        ctx.drawImage(image, source_x, source_y, sprite.frame_width, sprite.frame_height, tile.x * layer.grid_size, tile.y * layer.grid_size, sprite.frame_width, sprite.frame_height);
      }
      const image_data = ctx.getImageData(0, 0, layer.cols * layer.grid_size, layer.rows * layer.grid_size);
      return await createImageBitmap(image_data);
    }
    function game_loop(timestamp) {
      if (!gm.running || !gm.config || !gm.current_room) {
        requestAnimationFrame(game_loop);
        return;
      }
      const room = gm.rooms[gm.current_room];
      const frame_interval = 1000 / (room.fps * 2);
      if (timestamp - last_frame_time >= frame_interval) {
        const dt = timestamp - last_frame_time;
        last_frame_time = timestamp;
        const camera = room.camera;
        if (camera.follow) {
          const inst_id = room.object_index[camera.follow]?.[0];
          const target = room.instances[inst_id];
          if (!target) {
            console.error(`Camera target object not found: ${camera.follow}`);
          } else {
            camera.x = target.x - camera.width / 2;
            camera.y = target.y - camera.height / 2;
          }
        }
        gm.ctx.imageSmoothingEnabled = gm.config.image_smoothing_enabled;
        gm.ctx.imageSmoothingQuality = gm.config.image_smoothing_enabled ? "high" : "low";
        gm.ctx.save();
        gm.ctx.scale(device_pixel_ratio, device_pixel_ratio);
        gm.ctx.translate(-camera.x, -camera.y);
        gm.ctx.clearRect(camera.x, camera.y, camera.width, camera.height);
        gm.ctx.fillStyle = room.bg_color;
        gm.ctx.fillRect(camera.x, camera.y, camera.width, camera.height);
        const sorted_instances = Object.values(room.instances).sort((a, b) => a.z - b.z);
        for (const instance of sorted_instances) {
          const obj = gm.objects[instance.object_id];
          if (obj.step) {
            obj.step(dt, instance);
          }
          const mouse_over_instance = point_in_instance(instance, gm.mouse_x, gm.mouse_y);
          if (mouse_over_instance && obj.mouse_over) {
            obj.mouse_over(instance);
          } else if (!mouse_over_instance && obj.mouse_out) {
            obj.mouse_out(instance);
          }
          if (mouse_over_instance) {
            if (gm.mouse_buttons_pressed[0] && obj.mouse_down) {
              obj.mouse_down(instance);
            }
            if (!gm.mouse_buttons_pressed[0] && obj.mouse_up) {
              obj.mouse_up(instance);
            }
          }
          if (obj.animation_end && animation_ended(instance)) {
            obj.animation_end(instance);
          }
          if (instance.sprite) {
            draw_sprite(instance);
          } else if (instance.tile_layer) {
            draw_layer(instance);
          }
          if (obj.draw) {
            obj.draw(instance);
          }
          if (gm.config && gm.config.debug) {
            draw_collision_mask(instance);
          }
        }
        gm.ctx.restore();
      }
      requestAnimationFrame(game_loop);
    }
    Promise.all(asset_promises).then(() => {
      return Promise.all(Object.values(gm.tile_layers).map((layer) => render_tile_layers(layer).then((image_data) => {
        layer.image = image_data;
      })));
    }).then(() => {
      requestAnimationFrame(game_loop);
      start_callback(gm);
    });
  }
  function create_object(obj) {
    if (!obj.id) {
      throw new Error("Object ID is required");
    }
    const default_obj = {
      id: "",
      collision_mask: { type: "rect", geom: [0, 0, 0, 0] },
      tile_layer: null,
      sprite: null
    };
    const merged_obj = { ...default_obj, ...obj };
    gm.objects[merged_obj.id] = merged_obj;
  }
  function create_sound(sound) {
    if (!sound.id) {
      throw new Error("Sound ID is required");
    }
    if (!sound.filepath) {
      throw new Error("Sound filepath is required");
    }
    const default_sound = {
      id: "",
      filepath: "",
      volume: 1,
      buffer: null,
      source: null
    };
    const merged_sound = { ...default_sound, ...sound };
    gm.sounds[merged_sound.id] = merged_sound;
  }
  function create_sprite(sprite) {
    if (!sprite.id) {
      throw new Error("Sprite ID is required");
    }
    if (!sprite.filepath) {
      throw new Error("Sprite filepath is required");
    }
    const default_sprite = {
      id: "",
      frames: 1,
      frame_width: 0,
      frame_height: 0,
      origin_x: 0,
      origin_y: 0,
      filepath: ""
    };
    const merged_sprite = { ...default_sprite, ...sprite };
    gm.sprites[merged_sprite.id] = merged_sprite;
  }
  function create_room(room) {
    if (!room.id) {
      throw new Error("Room ID is required");
    }
    const default_room = {
      id: "",
      width: 800,
      height: 600,
      fps: 60,
      bg_color: "#000000",
      setup: () => [],
      instances: {},
      instance_refs: {},
      object_index: {},
      camera: {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        viewport_width: 800,
        viewport_height: 600
      }
    };
    const merged_room = { ...default_room, ...room };
    gm.rooms[merged_room.id] = merged_room;
  }
  function create_layer(layer) {
    if (!layer.id) {
      throw new Error("Layer ID is required");
    }
    const default_layer = {
      id: "",
      cols: 0,
      rows: 0,
      grid_size: 32,
      tiles: []
    };
    const merged_layer = { ...default_layer, ...layer };
    gm.tile_layers[merged_layer.id] = merged_layer;
  }
  function draw_collision_mask(instance) {
    const ctx = gm.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
    ctx.lineWidth = 2;
    if (instance.collision_mask.type === "rect") {
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
  function draw_sprite(instance) {
    if (!instance.sprite || !gm.sprites[instance.sprite]) {
      return;
    }
    const image = gm.images[instance.sprite];
    const sprite = gm.sprites[instance.sprite];
    const ctx = gm.ctx;
    instance.image_clock += 1;
    if (sprite.frames > 1 && instance.image_speed !== 0) {
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
    ctx.rotate(instance.image_angle * Math.PI / 180);
    ctx.scale(instance.image_scale_x, instance.image_scale_y);
    ctx.globalAlpha = instance.image_alpha;
    ctx.drawImage(image, source_x, source_y, sprite.frame_width, sprite.frame_height, -sprite.origin_x, -sprite.origin_y, sprite.frame_width, sprite.frame_height);
    ctx.restore();
  }
  function draw_layer(instance) {
    if (!instance.tile_layer)
      return;
    const layer = gm.tile_layers[instance.tile_layer];
    if (!layer || !layer.image)
      return;
    gm.ctx.save();
    gm.ctx.translate(instance.x, instance.y);
    gm.ctx.rotate(instance.image_angle * Math.PI / 180);
    gm.ctx.scale(instance.image_scale_x, instance.image_scale_y);
    gm.ctx.globalAlpha = instance.image_alpha;
    gm.ctx.drawImage(layer.image, 0, 0, layer.cols * layer.grid_size, layer.rows * layer.grid_size);
    gm.ctx.restore();
  }
  function instances_colliding(a, b) {
    if (!a || !b)
      return false;
    if (a.collision_mask.type === "rect" && b.collision_mask.type === "rect") {
      const [ax, ay, aw, ah] = a.collision_mask.geom;
      const [bx, by, bw, bh] = b.collision_mask.geom;
      return !(a.x + ax + aw < b.x + bx || a.x + ax > b.x + bx + bw || a.y + ay + ah < b.y + by || a.y + ay > b.y + by + bh);
    } else if (a.collision_mask.type === "circle" && b.collision_mask.type === "circle") {
      const [ar] = a.collision_mask.geom;
      const [br] = b.collision_mask.geom;
      const distance = point_distance(a.x, a.y, b.x, b.y);
      return distance < ar + br;
    } else {
      let circle, rect;
      if (a.collision_mask.type === "circle") {
        circle = a;
        rect = b;
      } else {
        circle = b;
        rect = a;
      }
      const [radius] = circle.collision_mask.geom;
      const [rx, ry, rw, rh] = rect.collision_mask.geom;
      const closest_x = Math.max(rect.x + rx, Math.min(circle.x, rect.x + rx + rw));
      const closest_y = Math.max(rect.y + ry, Math.min(circle.y, rect.y + ry + rh));
      const distance_x = circle.x - closest_x;
      const distance_y = circle.y - closest_y;
      const distance_squared = distance_x * distance_x + distance_y * distance_y;
      return distance_squared < radius * radius;
    }
  }
  function objects_colliding(instance, obj_id) {
    const room = gm.rooms[gm.current_room];
    const colliding_instances = [];
    if (!instance)
      return colliding_instances;
    const potential_collisions = room.object_index[obj_id] || [];
    for (const other_id of potential_collisions) {
      const other = room.instances[other_id];
      if (instances_colliding(instance, other)) {
        colliding_instances.push(other);
      }
    }
    return colliding_instances;
  }
  function instance_save(key, instance) {
    const room = gm.rooms[gm.current_room];
    room.instance_refs[key] = instance.id;
  }
  function instance_get(key) {
    const room = gm.rooms[gm.current_room];
    return room.instances[room.instance_refs[key]];
  }
  function instance_create(obj_id) {
    const room = gm.rooms[gm.current_room];
    const obj = gm.objects[obj_id];
    if (!obj)
      throw new Error(`Object with id ${obj_id} not found`);
    let sprite_info = { width: 0, height: 0 };
    if (obj.sprite) {
      if (!gm.sprites[obj.sprite])
        throw new Error(`Sprite with id ${obj.sprite} not found`);
      const spr = gm.sprites[obj.sprite];
      sprite_info = { width: spr.frame_width, height: spr.frame_height };
    }
    const instance = {
      id: unique_id(),
      object_id: obj_id,
      x: 0,
      y: 0,
      z: 0,
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
      image_clock: 0
    };
    room.instances[instance.id] = instance;
    if (!room.object_index[obj_id]) {
      room.object_index[obj_id] = [];
    }
    room.object_index[obj_id].push(instance.id);
    if (obj.create) {
      obj.create(instance);
    }
    return instance;
  }
  function instance_count(obj_id) {
    const room = gm.rooms[gm.current_room];
    return (room.object_index[obj_id] || []).length;
  }
  function instance_destroy(instance) {
    const room = gm.rooms[gm.current_room];
    if (instance.id in room.instances) {
      const obj = gm.objects[instance.object_id];
      if (obj.destroy) {
        obj.destroy(instance);
      }
      delete room.instances[instance.id];
      const index = room.object_index[instance.object_id].findIndex((i) => i === instance.id);
      if (index !== -1) {
        room.object_index[instance.object_id].splice(index, 1);
      }
      return true;
    }
    return false;
  }
  function instance_exists(instance) {
    const room = gm.rooms[gm.current_room];
    return instance.id in room.instances;
  }
  function point_in_instance(instance, x, y) {
    if (instance.collision_mask.type === "rect") {
      const [mx, my, mw, mh] = instance.collision_mask.geom;
      return x >= instance.x + mx && x <= instance.x + mx + mw && y >= instance.y + my && y <= instance.y + my + mh;
    } else if (instance.collision_mask.type === "circle") {
      const [radius] = instance.collision_mask.geom;
      return point_distance(x, y, instance.x, instance.y) <= radius;
    }
    return false;
  }
  function animation_ended(instance) {
    if (!instance || !instance.sprite) {
      return false;
    }
    const sprite = gm.sprites[instance.sprite];
    return instance.image_index === sprite.frames - 1;
  }
  function play_sound(sound_id, opts = { volume: 1, loop: false }) {
    const sound = gm.sounds[sound_id];
    if (!sound || !sound.buffer) {
      console.error(`Sound ${sound_id} not found or not loaded`);
      return;
    }
    if (sound.source) {
      sound.source.stop();
    }
    sound.source = gm.audio_context.createBufferSource();
    sound.source.buffer = sound.buffer;
    sound.source.loop = opts.loop;
    const gain_node = gm.audio_context.createGain();
    gain_node.gain.value = sound.volume;
    sound.source.connect(gain_node);
    gain_node.connect(gm.audio_master_gain);
    sound.source.start(0);
  }
  function stop_sound(sound_id) {
    const sound = gm.sounds[sound_id];
    if (sound && sound.source) {
      sound.source.stop();
      sound.source = null;
    }
  }
  function sound_volume(sound_id, volume) {
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
  function master_volume(volume) {
    gm.audio_master_gain.gain.value = Math.max(0, Math.min(1, volume));
  }
  function room_goto(room_id) {
    if (!gm.rooms[room_id])
      throw new Error(`Room with id ${room_id} not found`);
    if (!gm.canvas) {
      throw new Error("Canvas not initialized");
    }
    if (gm.current_room) {
      call_objects_room_end(gm.current_room);
    }
    gm.current_room = room_id;
    const room = gm.rooms[room_id];
    room.camera.x = 0;
    room.camera.y = 0;
    last_frame_time = 0;
    room.instances = {};
    gm.canvas.width = room.camera.width * device_pixel_ratio;
    gm.canvas.height = room.camera.height * device_pixel_ratio;
    gm.canvas.style.width = `${room.camera.viewport_width}px`;
    gm.canvas.style.height = `${room.camera.viewport_height}px`;
    room.setup().forEach((item) => {
      const instance = instance_create(item.id);
      if (instance) {
        if (item.x !== undefined)
          instance.x = item.x;
        if (item.y !== undefined)
          instance.y = item.y;
        if (item.z !== undefined)
          instance.z = item.z;
        if (item.mask !== undefined)
          instance.collision_mask = item.mask;
      }
    });
    call_objects_room_start(room_id);
  }
  function room_current() {
    return gm.current_room ? gm.rooms[gm.current_room] : null;
  }
  function call_objects_room_start(room_id) {
    const room = gm.rooms[room_id];
    Object.values(room.instances).forEach((instance) => {
      const obj = gm.objects[instance.object_id];
      if (obj.room_start) {
        obj.room_start(instance);
      }
    });
  }
  function call_objects_room_end(room_id) {
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
    room_current,
    play_sound,
    stop_sound,
    sound_volume,
    master_volume,
    instance_save,
    instance_get,
    instances_colliding,
    instance_create,
    instance_count,
    instance_destroy,
    instance_exists,
    objects_colliding,
    animation_ended
  };
}
function point_distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
function point_direction(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}
function unique_id() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  } else if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } else {
    throw new Error("Crypto functionality not available");
  }
}
var stormborn_default = { create_game, point_distance, point_direction, unique_id };
export {
  stormborn_default as default
};
