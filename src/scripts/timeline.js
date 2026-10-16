const stage = document.querySelector("#stage");
const line = stage.querySelector(".timeline-line");
const nodes = [...stage.querySelectorAll(".timeline-node")];
let animations = [];

stage.addEventListener("cards:replay", ({ detail }) => {
	for (const animation of animations) animation.cancel();
	animations = [line.animate(
		[{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
		{ duration: detail.dropInterval * (nodes.length - 1) + 650, easing: "ease-out", fill: "both" },
	)];
	nodes.forEach((node, index) => {
		animations.push(node.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 250, delay: index * detail.dropInterval + 350, fill: "both",
		}));
	});
});

window.addEventListener("pagehide", () => {
	for (const animation of animations) animation.cancel();
});

try {
	// Register the line animation before the shared physics starts its first drop.
	await import("./physics.js");
} catch (error) {
	document.documentElement.classList.remove("is-live");
	console.error("Could not start timeline cards", error);
}
