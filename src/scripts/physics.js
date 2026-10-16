import { initializeCardColor } from "./card-color.js";

const stage = document.querySelector("#stage");
const useSoft = stage?.dataset.selectablePhysics === "true"
	&& new URLSearchParams(window.location.search).get("physics") === "soft";

if (stage) stage.dataset.physicsMode = useSoft ? "soft" : "rigid";
initializeCardColor();

try {
	if (useSoft) await import("./soft.js");
	else await import("./main.js");
} catch (error) {
	// Keep the content visible if an animation module cannot be loaded.
	document.documentElement.classList.remove("is-live");
	console.error("Could not start falling cards", error);
}
