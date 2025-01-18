// stormborn.ts
function create_game(config) {
  if (config.culling_enabled === undefined) {
    config.culling_enabled = true;
  }
  if (config.shape_smoothing_enabled === undefined) {
    config.shape_smoothing_enabled = true;
  }
  const gm = {
    config,
    canvas: null,
    running: false,
    keydown: {},
    mousedown: {},
    mouse_x: 0,
    mouse_y: 0,
    touch_points: {},
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
  async function run_game(start_callback) {
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
      if (!gm.running || !gm.current_room)
        return;
      if (e.key === "CapsLock")
        return;
      const k = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      gm.keydown[k] = true;
      const room = gm.rooms[gm.current_room];
      Object.values(room.instances).forEach((instance) => {
        const obj = gm.objects[instance.object_id];
        if (obj.key_pressed) {
          obj.key_pressed(instance, k);
        }
      });
    });
    window.addEventListener("keyup", (e) => {
      if (!gm.running || !gm.current_room)
        return;
      if (e.key === "CapsLock")
        return;
      const k = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      gm.keydown[k] = false;
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
      if (!gm.running || !gm.current_room)
        return;
      const rect = canvas.getBoundingClientRect();
      const mouse_x = e.clientX - rect.left;
      const mouse_y = e.clientY - rect.top;
      const width_scale = gm.rooms[gm.current_room].screen.final_width / gm.rooms[gm.current_room].screen.width;
      const height_scale = gm.rooms[gm.current_room].screen.final_height / gm.rooms[gm.current_room].screen.height;
      gm.mouse_x = mouse_x / width_scale;
      gm.mouse_y = mouse_y / height_scale;
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
      if (!gm.running || !gm.current_room)
        return;
      gm.mousedown[e.button] = true;
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
      if (!gm.running || !gm.current_room)
        return;
      gm.mousedown[e.button] = false;
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
      if (!gm.running || !gm.current_room)
        return;
      const delta = Math.sign(e.deltaY);
      const room = gm.rooms[gm.current_room];
      Object.values(room.instances).forEach((instance) => {
        const obj = gm.objects[instance.object_id];
        if (obj.global_mouse_wheel) {
          obj.global_mouse_wheel(instance, delta);
        }
        if (obj.mouse_wheel && point_in_instance(instance, gm.mouse_x, gm.mouse_y)) {
          obj.mouse_wheel(instance, delta);
        }
      });
    });
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (!gm.running || !gm.current_room)
        return;
      const rect = canvas.getBoundingClientRect();
      const width_scale = gm.rooms[gm.current_room].screen.final_width / gm.rooms[gm.current_room].screen.width;
      const height_scale = gm.rooms[gm.current_room].screen.final_height / gm.rooms[gm.current_room].screen.height;
      Array.from(e.changedTouches).forEach((touch) => {
        const touch_x = (touch.clientX - rect.left) / width_scale;
        const touch_y = (touch.clientY - rect.top) / height_scale;
        gm.touch_points[touch.identifier] = { x: touch_x, y: touch_y };
        const room = gm.rooms[gm.current_room];
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
      if (!gm.running || !gm.current_room)
        return;
      const rect = canvas.getBoundingClientRect();
      const width_scale = gm.rooms[gm.current_room].screen.final_width / gm.rooms[gm.current_room].screen.width;
      const height_scale = gm.rooms[gm.current_room].screen.final_height / gm.rooms[gm.current_room].screen.height;
      Array.from(e.changedTouches).forEach((touch) => {
        const touch_x = (touch.clientX - rect.left) / width_scale;
        const touch_y = (touch.clientY - rect.top) / height_scale;
        gm.touch_points[touch.identifier] = { x: touch_x, y: touch_y };
        const room = gm.rooms[gm.current_room];
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
      if (!gm.running || !gm.current_room)
        return;
      Array.from(e.changedTouches).forEach((touch) => {
        const touch_point = gm.touch_points[touch.identifier];
        if (!touch_point)
          return;
        const room = gm.rooms[gm.current_room];
        Object.values(room.instances).forEach((instance) => {
          const obj = gm.objects[instance.object_id];
          if (obj.global_touch_end) {
            obj.global_touch_end(instance, touch.identifier, touch_point.x, touch_point.y);
          }
        });
        delete gm.touch_points[touch.identifier];
      });
    });
    canvas.addEventListener("touchcancel", (e) => {
      e.preventDefault();
      if (!gm.running || !gm.current_room)
        return;
      Array.from(e.changedTouches).forEach((touch) => {
        const touch_point = gm.touch_points[touch.identifier];
        if (!touch_point)
          return;
        const room = gm.rooms[gm.current_room];
        Object.values(room.instances).forEach((instance) => {
          const obj = gm.objects[instance.object_id];
          if (obj.global_touch_end) {
            obj.global_touch_end(instance, touch.identifier, touch_point.x, touch_point.y);
          }
        });
        delete gm.touch_points[touch.identifier];
      });
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
        gm.ctx.imageSmoothingEnabled = gm.config.image_smoothing_enabled;
        gm.ctx.imageSmoothingQuality = gm.config.image_smoothing_enabled ? "high" : "low";
        if (!gm.config.shape_smoothing_enabled) {
          gm.ctx.filter = "url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxmaWx0ZXIgaWQ9ImZpbHRlciIgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIj48ZmVDb21wb25lbnRUcmFuc2Zlcj48ZmVGdW5jUiB0eXBlPSJpZGVudGl0eSIvPjxmZUZ1bmNHIHR5cGU9ImlkZW50aXR5Ii8+PGZlRnVuY0IgdHlwZT0iaWRlbnRpdHkiLz48ZmVGdW5jQSB0eXBlPSJkaXNjcmV0ZSIgdGFibGVWYWx1ZXM9IjAgMSIvPjwvZmVDb21wb25lbnRUcmFuc2Zlcj48L2ZpbHRlcj48L3N2Zz4=#filter)";
        }
        gm.ctx.clearRect(0, 0, gm.canvas.width, gm.canvas.height);
        gm.ctx.fillStyle = room.bg_color;
        gm.ctx.fillRect(0, 0, gm.canvas.width, gm.canvas.height);
        const sorted_instances = Object.values(room.instances).sort((a, b) => a.z - b.z);
        for (const instance of sorted_instances) {
          const obj = gm.objects[instance.object_id];
          if (obj.step) {
            obj.step(dt, instance);
          }
          const mouse_over = point_in_instance(instance, gm.mouse_x, gm.mouse_y);
          if (mouse_over && obj.mouse_over)
            obj.mouse_over(instance);
          else if (!mouse_over && obj.mouse_out)
            obj.mouse_out(instance);
          if (mouse_over) {
            if (gm.mousedown[0] && obj.mouse_down)
              obj.mouse_down(instance);
            if (!gm.mousedown[0] && obj.mouse_up)
              obj.mouse_up(instance);
          }
          if (obj.animation_end && animation_ended(instance)) {
            obj.animation_end(instance);
          }
        }
        room.cameras.forEach((camera) => {
          if (!camera.active)
            return;
          update_camera_position(camera, room);
          gm.ctx.save();
          gm.ctx.scale(device_pixel_ratio, device_pixel_ratio);
          gm.ctx.translate(camera.screen_x, camera.screen_y);
          gm.ctx.translate(-camera.x, -camera.y);
          gm.ctx.beginPath();
          gm.ctx.rect(camera.x, camera.y, camera.screen_width, camera.screen_height);
          gm.ctx.clip();
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
    const methods = {};
    const properties = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === "function" && key !== "setup" && key !== "create" && key !== "destroy" && key !== "step" && key !== "draw" && key !== "mouse_over" && key !== "mouse_out" && key !== "mouse_down" && key !== "mouse_up" && key !== "mouse_wheel" && key !== "key_pressed" && key !== "key_released" && key !== "global_mouse_pressed" && key !== "global_mouse_released" && key !== "global_mouse_wheel" && key !== "global_mouse_move" && key !== "global_touch_start" && key !== "global_touch_move" && key !== "global_touch_end" && key !== "animation_end" && key !== "room_start" && key !== "room_end") {
        methods[key] = value;
      } else {
        properties[key] = value;
      }
    });
    const default_obj = {
      id: "",
      collision_mask: { type: "rect", geom: [0, 0, 0, 0] },
      tile_layer: null,
      sprite: null
    };
    const original_create = properties.create;
    properties.create = (instance, props) => {
      Object.entries(methods).forEach(([key, method]) => {
        instance[key] = (...args) => method(instance, ...args);
      });
      if (original_create) {
        original_create(instance, props);
      }
    };
    const merged_obj = { ...default_obj, ...properties };
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
      screen: {
        width: 800,
        height: 600,
        final_width: 800,
        final_height: 600
      },
      fps: 60,
      bg_color: "#000000",
      setup: () => [],
      instances: {},
      instance_refs: {},
      object_index: {},
      cameras: []
    };
    if (room.width && room.height && !room.screen) {
      room.screen = {
        width: room.width,
        height: room.height,
        final_width: room.width,
        final_height: room.height
      };
    }
    const camera = camera_create({
      id: unique_id(),
      screen_width: default_room.width,
      screen_height: default_room.height,
      active: true
    });
    default_room.cameras.push(camera);
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
  function update_camera_position(camera, room) {
    if (!camera.follow)
      return;
    const inst_id = room.object_index[camera.follow.target]?.[0];
    const target = room.instances[inst_id];
    if (!target) {
      console.error(`Camera target object not found: ${camera.follow.target}`);
      return;
    }
    const offset_x = camera.follow.offset_x || 0;
    const offset_y = camera.follow.offset_y || 0;
    let target_x = target.x - camera.screen_width / 2 + offset_x;
    let target_y = target.y - camera.screen_height / 2 + offset_y;
    camera.x = target_x;
    camera.y = target_y;
  }
  function draw_collision_mask(instance) {
    const ctx = gm.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
    ctx.lineWidth = 2;
    if (instance.collision_mask.type === "polygon") {
      const vertices = instance.collision_mask.geom;
      ctx.beginPath();
      ctx.moveTo(instance.x + vertices[0], instance.y + vertices[1]);
      for (let i = 2;i < vertices.length; i += 2) {
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
  function draw_sprite(instance, camera) {
    if (!instance.sprite || !gm.sprites[instance.sprite]) {
      return;
    }
    const image = gm.images[instance.sprite];
    const sprite = gm.sprites[instance.sprite];
    const ctx = gm.ctx;
    if (gm.config && gm.config.culling_enabled) {
      const final_width = sprite.frame_width * Math.abs(instance.image_scale_x);
      const final_height = sprite.frame_height * Math.abs(instance.image_scale_y);
      const scaled_origin_x = sprite.origin_x * Math.abs(instance.image_scale_x);
      const scaled_origin_y = sprite.origin_y * Math.abs(instance.image_scale_y);
      const bounds = {
        left: instance.x - scaled_origin_x,
        right: instance.x - scaled_origin_x + final_width,
        top: instance.y - scaled_origin_y,
        bottom: instance.y - scaled_origin_y + final_height
      };
      if (bounds.right < camera.x || bounds.left > camera.x + camera.screen_width || bounds.bottom < camera.y || bounds.top > camera.y + camera.screen_height) {
        instance.is_culled = true;
        return;
      }
    }
    instance.is_culled = false;
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
  function camera_create(config2) {
    const default_camera = {
      id: unique_id(),
      x: 0,
      y: 0,
      screen_width: 800,
      screen_height: 600,
      screen_x: 0,
      screen_y: 0,
      active: true
    };
    return { ...default_camera, ...config2 };
  }
  function instances_colliding(a, b) {
    if (!a || !b)
      return false;
    function transform_vertices(instance, vertices) {
      const transformed = [];
      for (let i = 0;i < vertices.length; i += 2) {
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
      return !(a.x + ax + aw < b.x + bx || a.x + ax > b.x + bx + bw || a.y + ay + ah < b.y + by || a.y + ay > b.y + by + bh);
    } else if (a.collision_mask.type === "circle" && b.collision_mask.type === "circle") {
      const [ar] = a.collision_mask.geom;
      const [br] = b.collision_mask.geom;
      const distance = point_distance(a.x, a.y, b.x, b.y);
      return distance < ar + br;
    } else if (a.collision_mask.type === "rect" && b.collision_mask.type === "circle" || a.collision_mask.type === "circle" && b.collision_mask.type === "rect") {
      let rect_instance;
      let circle_instance;
      if (a.collision_mask.type === "rect") {
        rect_instance = a;
        circle_instance = b;
      } else {
        rect_instance = b;
        circle_instance = a;
      }
      const [rx, ry, rw, rh] = rect_instance.collision_mask.geom;
      const [radius] = circle_instance.collision_mask.geom;
      return rect_circle_intersect(rect_instance.x + rx, rect_instance.y + ry, rw, rh, circle_instance.x, circle_instance.y, radius);
    } else if (a.collision_mask.type === "polygon" || b.collision_mask.type === "polygon") {
      let polygon_instance;
      let other_instance;
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
          other_instance.y + ry + rh
        ];
        return polygons_intersect(vertices, rect_vertices);
      } else if (other_instance.collision_mask.type === "circle") {
        const [radius] = other_instance.collision_mask.geom;
        return polygon_circle_intersect(vertices, other_instance.x, other_instance.y, radius);
      }
    }
    return false;
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
  function instance_ref(key, instance) {
    const room = gm.rooms[gm.current_room];
    if (instance === undefined) {
      return room.instances[room.instance_refs[key]];
    } else {
      room.instance_refs[key] = instance.id;
      return instance;
    }
  }
  function instance_unref(key) {
    const room = gm.rooms[gm.current_room];
    delete room.instance_refs[key];
  }
  function instance_create(obj_id, x, y, z, props) {
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
      image_clock: 0
    };
    room.instances[instance.id] = instance;
    if (!room.object_index[obj_id]) {
      room.object_index[obj_id] = [];
    }
    room.object_index[obj_id].push(instance.id);
    if (obj.create) {
      obj.create(instance, props);
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
    if (instance.collision_mask.type === "polygon") {
      const transformed_vertices = [];
      const vertices = instance.collision_mask.geom;
      for (let i = 0;i < vertices.length; i += 2) {
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
    if (!gm.canvas)
      throw new Error("Canvas not initialized");
    if (gm.current_room) {
      call_objects_room_end(gm.current_room);
    }
    gm.current_room = room_id;
    const room = gm.rooms[room_id];
    last_frame_time = 0;
    room.instances = {};
    room.instance_refs = {};
    room.object_index = {};
    gm.canvas.width = room.screen.width * device_pixel_ratio;
    gm.canvas.height = room.screen.height * device_pixel_ratio;
    gm.canvas.style.width = `${room.screen.final_width}px`;
    gm.canvas.style.height = `${room.screen.final_height}px`;
    room.setup().forEach((item) => {
      const init = {
        x: 0,
        y: 0,
        z: 0,
        props: {}
      };
      if (item.x !== undefined)
        init.x = item.x;
      if (item.y !== undefined)
        init.y = item.y;
      if (item.z !== undefined)
        init.z = item.z;
      if (item.props !== undefined)
        init.props = item.props;
      const instance = instance_create(item.id, item.x, item.y, item.z, item.props);
      if (item.mask !== undefined)
        instance.collision_mask = item.mask;
    });
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
    animation_ended
  };
}
function requeue(time = 0) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
function unique_id() {
  return crypto.randomUUID();
}
function point_distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
function point_direction(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}
function point_in_polygon(x, y, vertices) {
  let inside = false;
  const len = vertices.length;
  for (let i = 0, j = len - 2;i < len; j = i, i += 2) {
    const xi = vertices[i];
    const yi = vertices[i + 1];
    const xj = vertices[j];
    const yj = vertices[j + 1];
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
function rect_circle_intersect(rect_x, rect_y, rect_width, rect_height, circle_x, circle_y, circle_radius) {
  const closest_x = Math.max(rect_x, Math.min(circle_x, rect_x + rect_width));
  const closest_y = Math.max(rect_y, Math.min(circle_y, rect_y + rect_height));
  const distance_x = circle_x - closest_x;
  const distance_y = circle_y - closest_y;
  const distance_squared = distance_x * distance_x + distance_y * distance_y;
  return distance_squared <= circle_radius * circle_radius;
}
function circle_line_segment_intersect(circle_x, circle_y, circle_radius, line_x1, line_y1, line_x2, line_y2) {
  const ac_x = circle_x - line_x1;
  const ac_y = circle_y - line_y1;
  const ab_x = line_x2 - line_x1;
  const ab_y = line_y2 - line_y1;
  const ab_squared = ab_x * ab_x + ab_y * ab_y;
  const t = Math.max(0, Math.min(1, (ac_x * ab_x + ac_y * ab_y) / ab_squared));
  const closest_x = line_x1 + t * ab_x;
  const closest_y = line_y1 + t * ab_y;
  const distance = point_distance(circle_x, circle_y, closest_x, closest_y);
  return distance <= circle_radius;
}
function polygon_circle_intersect(vertices, circle_x, circle_y, circle_radius) {
  if (point_in_polygon(circle_x, circle_y, vertices)) {
    return true;
  }
  for (let i = 0;i < vertices.length; i += 2) {
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
function line_segments_intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denominator = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (denominator === 0)
    return false;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
function polygons_intersect(vertices1, vertices2) {
  for (let i = 0;i < vertices1.length; i += 2) {
    if (point_in_polygon(vertices1[i], vertices1[i + 1], vertices2)) {
      return true;
    }
  }
  for (let i = 0;i < vertices2.length; i += 2) {
    if (point_in_polygon(vertices2[i], vertices2[i + 1], vertices1)) {
      return true;
    }
  }
  for (let i = 0;i < vertices1.length; i += 2) {
    const next1 = (i + 2) % vertices1.length;
    const x1 = vertices1[i];
    const y1 = vertices1[i + 1];
    const x2 = vertices1[next1];
    const y2 = vertices1[next1 + 1];
    for (let j = 0;j < vertices2.length; j += 2) {
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
var VERSION = "pre-0.6.0";
var stormborn_default = {
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
  polygons_intersect
};
export {
  stormborn_default as default
};
