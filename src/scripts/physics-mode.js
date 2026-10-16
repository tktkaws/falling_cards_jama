export function addPhysicsModeControl(pane) {
	const stage = document.querySelector("#stage");
	if (stage?.dataset.selectablePhysics !== "true") return;

	const selection = { soft: stage.dataset.physicsMode === "soft" };
	pane.addBinding(selection, "soft", { label: "Soft" }).on("change", ({ value }) => {
		// Keep the choice in the URL so resize/reduced-motion reloads preserve it.
		const url = new URL(window.location.href);
		url.searchParams.set("physics", value ? "soft" : "rigid");
		window.location.assign(url.href);
	});
}
