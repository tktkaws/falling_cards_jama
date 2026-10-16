import Matter from "matter-js";
import { Pane } from "tweakpane";
import { addPhysicsModeControl } from "./physics-mode.js";
import { addCardColorControl } from "./card-color.js";

const { Engine, Runner, Bodies, Body, Composite, Composites, Constraint } = Matter;
const NS = "http://www.w3.org/2000/svg";
const stage = document.querySelector("#stage");
const defaults = { skeleton: false, columns: 6, rows: 6, angle: (0.04 * 180) / Math.PI, restitution: 0.34, dropDistance: Number(stage?.dataset.dropDistance ?? 0.85), gravity: 1.05, frictionAir: 0.006, dropInterval: Number(stage?.dataset.dropInterval ?? 140), lockFrames: 18 };
const params = { ...defaults };
const WALL = 220;

const cards = [...document.querySelectorAll("#stage .pic")];
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const wide = window.matchMedia("(min-width: 1024px)");

if (stage && cards.length && !reduced.matches && wide.matches) start();

function start() {
	const engine = Engine.create({ enableSleeping: true });
	engine.gravity.y = params.gravity;
	engine.positionIterations = 10;
	engine.velocityIterations = 8;
	const runner = Runner.create();
	const svg = document.createElementNS(NS, "svg");
	svg.setAttribute("class", "skin");
	svg.setAttribute("aria-hidden", "true");
	stage.append(svg);
	const stageRect = stage.getBoundingClientRect();
	svg.setAttribute("width", String(stageRect.width));
	svg.setAttribute("height", String(stageRect.height));
	svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
	let items = cards.map((card, index) => createItem(card, index, stageRect, svg));
	let meshColumns = params.columns;
	let meshRows = params.rows;
	for (const item of items) Composite.add(engine.world, item.shelf);

	let frame = 0;
	let dropTimers = [];
	let running = false;
	let stageVisible = true;
	let settled = false;

	function resume() {
		if (running || settled || document.hidden || !stageVisible) return;
		running = true;
		Runner.run(runner, engine);
		frame = requestAnimationFrame(tick);
	}

	function pause() {
		running = false;
		Runner.stop(runner);
		cancelAnimationFrame(frame);
	}

	function drop(item) {
		item.spawnY = item.y - item.height * params.dropDistance;
		const startAngle = ((item.index % 2 === 0 ? -1 : 1) * (params.angle * Math.PI / 180)) * (1 + (item.index % 3) * 0.15625);
		const cos = Math.cos(startAngle);
		const sin = Math.sin(startAngle);
		for (const body of item.composite.bodies) {
			const offset = item.rests[body.plugin.particleId];
			Body.setPosition(body, {
				x: item.x + offset.x * cos - offset.y * sin,
				y: item.spawnY + offset.x * sin + offset.y * cos,
			});
			Body.setVelocity(body, { x: 0, y: 0 });
		}
		Composite.add(engine.world, item.composite);
		item.dropped = true;
		paint(item);
	}

	function tick() {
		let pending = false;
		for (const item of items) {
			if (!item.dropped) { pending = true; continue; }
			if (item.locked) continue;
			const bodies = item.composite.bodies;
			if (item.settling) {
				let remaining = 0;
				for (const body of bodies) {
					const rest = item.rests[body.plugin.particleId];
					const dx = item.x + rest.x - body.position.x;
					const dy = item.y + rest.y - body.position.y;
					remaining = Math.max(remaining, Math.hypot(dx, dy));
					Body.setPosition(body, {
						x: body.position.x + dx * 0.2,
						y: body.position.y + dy * 0.2,
					});
				}
				if (remaining < 0.05) {
					for (const body of bodies) {
						const rest = item.rests[body.plugin.particleId];
						Body.setPosition(body, { x: item.x + rest.x, y: item.y + rest.y });
					}
					item.locked = true;
				} else pending = true;
				paint(item);
				continue;
			}
			const centerY = bodies.reduce((sum, body) => sum + body.position.y, 0) / bodies.length;
			const speed = Math.max(...bodies.map((body) => Math.abs(body.velocity.y)));
			const horizontalOffset = item.x - centerX(bodies);
			for (const body of bodies) {
				Body.setPosition(body, { x: body.position.x + horizontalOffset, y: body.position.y });
				Body.setVelocity(body, { x: 0, y: body.velocity.y });
			}
			if (centerY >= item.y - 8 && speed < 0.65) item.calm += 1;
			else item.calm = 0;
			if (item.calm >= params.lockFrames) {
				for (const body of bodies) {
					Body.setVelocity(body, { x: 0, y: 0 });
					Body.setAngle(body, 0);
					Body.setStatic(body, true);
				}
				item.settling = true;
				pending = true;
				item.fade = 1;
				paint(item);
				continue;
			}
			pending = true;
			paint(item);
		}
		if (!pending) { settled = true; pause(); return; }
		frame = requestAnimationFrame(tick);
	}

	function replay() {
		for (const timer of dropTimers) window.clearTimeout(timer);
		if (meshColumns !== params.columns || meshRows !== params.rows) {
			for (const item of items) {
				Composite.remove(engine.world, item.composite);
				Composite.remove(engine.world, item.shelf);
			}
			Engine.clear(engine);
			svg.replaceChildren();
			items = cards.map((card, index) => createItem(card, index, stageRect, svg));
			for (const item of items) Composite.add(engine.world, item.shelf);
			meshColumns = params.columns;
			meshRows = params.rows;
		}
		settled = false;
		engine.gravity.y = params.gravity;
		for (const item of items) {
			Composite.remove(engine.world, item.composite);
			item.dropped = false; item.locked = false; item.settling = false; item.calm = 0; item.fade = 0;
			for (const body of item.composite.bodies) {
				Body.setStatic(body, false);
				Body.setAngularVelocity(body, 0);
				body.restitution = params.restitution;
				body.frictionAir = params.frictionAir;
				Matter.Sleeping.set(body, false);
			}
			for (const cell of item.cells) cell.path.setAttribute("opacity", "0");
			item.label?.setAttribute("opacity", "0");
			item.skeleton.group.setAttribute("display", "none");
		}
		stage.dispatchEvent(new CustomEvent("cards:replay", { detail: { dropInterval: params.dropInterval } }));
		dropTimers = items.map((item, index) => window.setTimeout(() => drop(item), index * params.dropInterval));
		resume();
	}
	const pane = new Pane({ title: "調整" });
	addPhysicsModeControl(pane);
	const resetCardColor = addCardColorControl(pane);
	let resetting = false;
	pane.addBinding(params, "skeleton", { label: "骨格を表示" }).on("change", () => {
		if (!resetting) for (const item of items) paintSkeleton(item);
	});
	const mesh = pane.addFolder({ title: "粒度" });
	for (const [key, label] of [["rows", "行数（縦）"], ["columns", "列数（横）"]]) {
		mesh.addBinding(params, key, { label, min: 2, max: 20, step: 1 }).on("change", (event) => {
			if (!resetting && event.last) replay();
		});
	}
	const controls = [
		["angle", "傾き（度）", 25, 0.1], ["restitution", "反発", 1, 0.01],
		["dropDistance", "落ち始めの高さ", 3, 0.05], ["gravity", "重力", 3, 0.05],
		["frictionAir", "空気抵抗", 0.05, 0.001], ["dropInterval", "落下の間隔", 800, 10],
		["lockFrames", "止まるまでのフレーム", 90, 1],
	];
	for (const [key, label, max, step] of controls) pane.addBinding(params, key, { label, min: key === "lockFrames" ? 1 : 0, max, step }).on("change", (event) => { if (!resetting && event.last) replay(); });
	pane.addButton({ title: "もう一度落とす" }).on("click", replay);
	pane.addButton({ title: "初期状態に戻す" }).on("click", () => {
		resetCardColor();
		Object.assign(params, defaults); resetting = true; pane.refresh(); resetting = false; replay();
	});
	replay();

	const observer = new IntersectionObserver(([entry]) => {
		stageVisible = entry.isIntersecting;
		if (stageVisible) resume();
		else pause();
	});
	observer.observe(stage);
	document.addEventListener("visibilitychange", () => document.hidden ? pause() : resume());
	window.addEventListener("pagehide", () => {
		for (const timer of dropTimers) window.clearTimeout(timer);
		pause();
		observer.disconnect();
		pane.dispose();
	});
}

function centerX(bodies) {
	return bodies.reduce((sum, body) => sum + body.position.x, 0) / bodies.length;
}

function createItem(pic, index, stageRect, svg) {
	const COLUMNS = params.columns;
	const ROWS = params.rows;
	const rect = pic.getBoundingClientRect();
	const x = rect.left - stageRect.left + rect.width / 2;
	const y = rect.top - stageRect.top + rect.height / 2;
	const width = rect.width;
	const height = rect.height;
	const dx = width / (COLUMNS - 1);
	const dy = height / (ROWS - 1);
	const group = index + 1;
	const composite = Composites.stack(0, 0, COLUMNS, ROWS, dx, dy, (px, py, column, row) => {
		const body = Bodies.circle(px, py, Math.max(3, Math.min(dx, dy) * 0.12), {
			density: 0.0016, friction: 0.25, frictionStatic: 0.4, frictionAir: params.frictionAir,
			restitution: params.restitution, sleepThreshold: 40,
			collisionFilter: { group, category: 0x0001, mask: 0x0000 },
		});
		body.plugin.particleId = column + row * COLUMNS;
		return body;
	});
	// Set the measured grid before constraints capture their resting lengths.
	const rests = composite.bodies.map((_, id) => ({ x: (id % COLUMNS) * dx - width / 2, y: Math.floor(id / COLUMNS) * dy - height / 2 }));
	for (const body of composite.bodies) {
		const rest = rests[body.plugin.particleId];
		Body.setPosition(body, { x: x + rest.x, y: y - height * params.dropDistance + rest.y });
	}
	for (let row = 0; row < ROWS; row += 1) {
		for (let column = 0; column < COLUMNS; column += 1) {
			const body = composite.bodies[column + row * COLUMNS];
			if (column < COLUMNS - 1) Composite.add(composite, Constraint.create({ bodyA: body, bodyB: composite.bodies[column + 1 + row * COLUMNS], stiffness: 0.72, damping: 0.08 }));
			if (row < ROWS - 1) Composite.add(composite, Constraint.create({ bodyA: body, bodyB: composite.bodies[column + (row + 1) * COLUMNS], stiffness: 0.72, damping: 0.08 }));
			if (column < COLUMNS - 1 && row < ROWS - 1) Composite.add(composite, Constraint.create({ bodyA: body, bodyB: composite.bodies[column + 1 + (row + 1) * COLUMNS], stiffness: 0.45, damping: 0.08 }));
		}
	}
	// The visible outline follows particle centers, not their collision edges.
	const particle = composite.bodies[0];
	const bottomExtent = particle.bounds.max.y - particle.position.y;
	const floorY = y + height / 2 + bottomExtent;
	const shelf = Bodies.rectangle(x, floorY + WALL / 2, width + height, WALL, {
		isStatic: true, friction: 0.25, frictionStatic: 0.4,
		collisionFilter: { group, category: 0x0001, mask: 0x0000 },
	});
	const fill = pic.style.backgroundColor || getComputedStyle(pic).backgroundColor;
	// Draw one silhouette so fading never exposes overlapping cell edges.
	const ids = [];
	for (let column = 0; column < COLUMNS; column += 1) ids.push(column);
	for (let row = 1; row < ROWS; row += 1) ids.push(row * COLUMNS + COLUMNS - 1);
	for (let column = COLUMNS - 2; column >= 0; column -= 1) ids.push((ROWS - 1) * COLUMNS + column);
	for (let row = ROWS - 2; row > 0; row -= 1) ids.push(row * COLUMNS);
	const path = document.createElementNS(NS, "path");
	path.setAttribute("data-soft-surface", "");
	path.setAttribute("fill", fill);
	path.setAttribute("opacity", "0");
	svg.append(path);
	const cells = [{ path, ids }];
	// Text follows the soft body's center, angle and stretch, outside the static desc.
	const sourceLabel = pic.querySelector(".object-label");
	let label = null;
	if (pic.hasAttribute("data-soft-content")) {
		label = createContentOverlay(pic, width, height);
		svg.append(label);
	} else if (sourceLabel) {
		const style = getComputedStyle(sourceLabel);
		label = document.createElementNS(NS, "text");
		label.textContent = sourceLabel.textContent;
		label.setAttribute("text-anchor", "middle");
		label.setAttribute("dominant-baseline", "central");
		label.setAttribute("fill", style.color);
		label.setAttribute("font-family", style.fontFamily);
		label.setAttribute("font-size", style.fontSize);
		label.setAttribute("font-weight", style.fontWeight);
		label.setAttribute("letter-spacing", style.letterSpacing);
		label.setAttribute("opacity", "0");
		svg.append(label);
	}
	const skeletonGroup = document.createElementNS(NS, "g");
	skeletonGroup.setAttribute("display", "none");
	const links = document.createElementNS(NS, "path");
	links.setAttribute("fill", "none");
	links.setAttribute("stroke", "#fff");
	links.setAttribute("stroke-width", "1");
	const nodes = composite.bodies.map((body) => {
		const circle = document.createElementNS(NS, "circle");
		circle.setAttribute("r", String(body.circleRadius));
		circle.setAttribute("fill", "#ffcc00");
		circle.setAttribute("fill-opacity", "0.65");
		circle.setAttribute("stroke", "#222");
		circle.setAttribute("stroke-width", "1");
		return circle;
	});
	skeletonGroup.append(links, ...nodes);
	svg.append(skeletonGroup);
	const skeleton = { group: skeletonGroup, links, nodes };
	return { index, x, y, width, height, columns: COLUMNS, rows: ROWS, composite, rests, shelf, cells, label, skeleton, dropped: false, locked: false, calm: 0, fade: 0, spawnY: y - height * params.dropDistance };
}

function createContentOverlay(source, width, height) {
	const overlay = document.createElementNS(NS, "foreignObject");
	overlay.setAttribute("x", String(-width / 2));
	overlay.setAttribute("y", String(-height / 2));
	overlay.setAttribute("width", String(width));
	overlay.setAttribute("height", String(height));
	overlay.setAttribute("opacity", "0");
	const content = document.createElement("div");
	for (const child of source.childNodes) content.append(child.cloneNode(true));
	// Copy typography and spacing without copying the hidden/animated card box.
	const originals = [source, ...source.querySelectorAll("*")];
	const copies = [content, ...content.querySelectorAll("*")];
	const properties = ["box-sizing", "color", "font-family", "font-size", "font-weight", "font-style", "font-variant-numeric", "line-height", "letter-spacing", "text-align", "overflow-wrap", "margin", "padding"];
	originals.forEach((element, index) => {
		const style = getComputedStyle(element);
		for (const property of properties) copies[index].style.setProperty(property, style.getPropertyValue(property));
	});
	content.style.width = "100%";
	content.style.height = "100%";
	overlay.append(content);
	return overlay;
}

function paint(item) {
	const centerY = item.composite.bodies.reduce((sum, body) => sum + body.position.y, 0) / item.composite.bodies.length;
	const span = item.y - item.spawnY;
	item.fade = Math.max(item.fade, Math.min(1, Math.max(0, span === 0 ? 1 : (centerY - item.spawnY) / span)));
	for (const cell of item.cells) {
		const points = cell.ids.map((id) => item.composite.bodies[id].position);
		cell.path.setAttribute("opacity", String(item.fade));
		cell.path.setAttribute("d", `M${points.map(({ x, y }) => `${x},${y}`).join(" L")} Z`);
	}
	if (item.label) {
		const bodies = item.composite.bodies;
		// Average the opposite edges to avoid jitter from a single particle.
		const edge = (ids) => ids.reduce((sum, id) => ({
			x: sum.x + bodies[id].position.x / ids.length,
			y: sum.y + bodies[id].position.y / ids.length,
		}), { x: 0, y: 0 });
		const left = edge(Array.from({ length: item.rows }, (_, row) => row * item.columns));
		const right = edge(Array.from({ length: item.rows }, (_, row) => row * item.columns + item.columns - 1));
		const top = edge(Array.from({ length: item.columns }, (_, column) => column));
		const bottom = edge(Array.from({ length: item.columns }, (_, column) => (item.rows - 1) * item.columns + column));
		const a = (right.x - left.x) / item.width;
		const b = (right.y - left.y) / item.width;
		const c = (bottom.x - top.x) / item.height;
		const d = (bottom.y - top.y) / item.height;
		item.label.setAttribute("transform", `matrix(${a} ${b} ${c} ${d} ${centerX(bodies)} ${centerY})`);
		item.label.setAttribute("opacity", String(item.fade));
	}
	paintSkeleton(item);
}

function paintSkeleton(item) {
	const { group, links, nodes } = item.skeleton;
	const visible = params.skeleton && item.dropped;
	group.setAttribute("display", visible ? "inline" : "none");
	if (!visible) return;
	links.setAttribute("d", item.composite.constraints.map(({ bodyA, bodyB }) => {
		const a = bodyA.position;
		const b = bodyB.position;
		return `M${a.x},${a.y} L${b.x},${b.y}`;
	}).join(" "));
	item.composite.bodies.forEach((body, index) => {
		nodes[index].setAttribute("cx", String(body.position.x));
		nodes[index].setAttribute("cy", String(body.position.y));
	});
}

wide.addEventListener("change", () => window.location.reload());
reduced.addEventListener("change", () => window.location.reload());
window.addEventListener("resize", () => window.location.reload());
