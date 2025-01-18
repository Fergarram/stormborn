import Stormborn from "./stormborn.js";

Object.assign(window, Stormborn);

const game = create_game({
    title: "Connect Four",
    description: "Connect Four Game",
    image_smoothing_enabled: false,
    container: document.getElementById("game"),
    debug: false,
});

Object.assign(window, game);
