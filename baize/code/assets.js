// SPRITES
create_sprite({
    id: "spr_balls",
    filepath: "assets/balls.png",
    frames: 15,
    frame_width: 18,
    frame_height: 18,
    origin_x: 9,
    origin_y: 9
});

create_sprite({
    id: "spr_cue",
    filepath: "assets/cue.png",
    frames: 1,
    frame_width: 464,
    frame_height: 16,
    origin_x: 32,
    origin_y: 8
});
create_sprite({
    id: "spr_ball_white",
    filepath: "assets/white.png",
    frames: 2,
    frame_width: 18,
    frame_height: 18,
    origin_x: 9,
    origin_y: 9
});

create_sprite({
    id: "spr_wood",
    filepath: "assets/wood.png",
    frames: 1,
    frame_width: 824,
    frame_height: 472,
    origin_x: 0,
    origin_y: 0
});

// SOUNDS
create_sound({
    id: "snd_ball",
    filepath: "assets/ball.mp3",
});

create_sound({
    id: "snd_wall",
    filepath: "assets/wall.mp3",
});

create_sound({
    id: "snd_hole",
    filepath: "assets/hole.mp3",
});

create_sound({
    id: "snd_hit",
    filepath: "assets/hit.mp3",
});

create_sound({
    id: "snd_lost",
    filepath: "assets/lost.mp3",
});
