function applyCardColor(stage, color) {
	stage.style.setProperty("--selected-card-color", color);
	// Update the visible soft surfaces even after the simulation has stopped.
	for (const surface of stage.querySelectorAll("[data-soft-surface]")) {
		surface.setAttribute("fill", color);
	}
}

export function initializeCardColor() {
	const stage = document.querySelector("#stage");
	if (!stage?.dataset.cardColor) return;
	const saved = new URL(window.location.href).searchParams.get("cardColor");
	const color = saved && /^[0-9a-f]{6}$/i.test(saved) ? `#${saved}` : stage.dataset.cardColor;
	applyCardColor(stage, color);
}

export function addCardColorControl(pane) {
	const stage = document.querySelector("#stage");
	if (!stage?.dataset.cardColor) return () => {};

	const selection = { color: stage.style.getPropertyValue("--selected-card-color") || stage.dataset.cardColor };
	const saveColor = () => {
		const url = new URL(window.location.href);
		if (selection.color.toLowerCase() === stage.dataset.cardColor.toLowerCase()) url.searchParams.delete("cardColor");
		else url.searchParams.set("cardColor", selection.color.slice(1));
		window.history.replaceState(window.history.state, "", url.href);
	};
	const binding = pane.addBinding(selection, "color", { label: "カードの色" }).on("change", ({ value, last }) => {
		applyCardColor(stage, value);
		if (last) saveColor();
	});
	return () => {
		selection.color = stage.dataset.cardColor;
		applyCardColor(stage, selection.color);
		saveColor();
		binding.refresh();
	};
}
