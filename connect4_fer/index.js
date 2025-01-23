import Stormborn from "./stormborn.js";

Object.assign(window, Stormborn);

const game = create_game({
    title: "Connect 4",
    description: "Connect 4 Game",
    image_smoothing_enabled: false,
    container: document.getElementById("game"),
    debug: false,
});

Object.assign(window, game);

window.config = {
    viewport_width: 700,
    viewport_height: 600,
    scale: 1
};
