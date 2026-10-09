import Matter from "matter-js";
import { Pane } from "tweakpane";
import { cards } from "./cards.js";

const { Engine, Runner, Bodies, Body, Composite, Events, Sleeping } = Matter;

const WIDE_QUERY = "(min-width: 1024px)";
const WALL_THICKNESS = 220;

const defaults = {
	angle: (0.04 * 180) / Math.PI,
	restitution: 0.34,
	dropDistance: 0.85,
	gravity: 1.05,
	frictionAir: 0.006,
	dropInterval: 140,
	lockFrames: 18,
};
const params = { ...defaults };

const stage = document.querySelector("#stage");
const picElements = [...document.querySelectorAll("#stage .pic")];
const wide = window.matchMedia(WIDE_QUERY);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let replay = () => {};

if (!stage || picElements.length !== cards.length) {
	throw new Error("Falling cards markup does not match the card list.");
}

if (reduceMotion.matches || !wide.matches) {
	document.documentElement.classList.remove("is-live");
} else if (stage.dataset.physics !== "on") {
	stage.dataset.physics = "on";
	startPhysics();
}

mountPane();

reduceMotion.addEventListener("change", () => {
	window.location.reload();
});

wide.addEventListener("change", () => {
	window.location.reload();
});

function startPhysics() {
	const engine = Engine.create({ enableSleeping: true });
	engine.gravity.y = params.gravity;
	engine.positionIterations = 10;
	engine.velocityIterations = 8;

	const runner = Runner.create();
	const items = picElements.map((element, index) => createItem(element, index));

	for (const item of items) {
		Composite.add(engine.world, item.shelf);
	}

	Events.on(engine, "afterUpdate", () => {
		for (const item of items) {
			if (!item.dropped || item.locked) continue;
			pinHorizontal(item);
		}
	});

	let frameId = 0;
	let resizeFrame = 0;
	let simulating = false;
	let stageInView = true;
	let settled = false;

	function resume() {
		if (settled || simulating || document.hidden || !stageInView) return;
		simulating = true;
		Runner.run(runner, engine);
		frameId = requestAnimationFrame(tick);
	}

	function pause() {
		simulating = false;
		Runner.stop(runner);
		cancelAnimationFrame(frameId);
		frameId = 0;
	}

	function tick() {
		let pending = false;

		for (const item of items) {
			if (!item.dropped) {
				pending = true;
				continue;
			}

			if (item.locked) continue;

			if (shouldLock(item)) {
				lockItem(item);
				continue;
			}

			applyTransform(item);
			pending = true;
		}

		if (!pending) {
			settled = true;
			pause();
			return;
		}

		frameId = requestAnimationFrame(tick);
	}

	function drop(item) {
		item.spawnY = item.home.y - item.home.height * params.dropDistance;
		Body.setPosition(item.body, { x: item.home.x, y: item.spawnY });
		Body.setAngle(item.body, initialAngle(item.index));
		Body.setAngularVelocity(item.body, 0);
		Body.setVelocity(item.body, { x: 0, y: 0 });
		Sleeping.set(item.body, false);
		applyTransform(item);
		item.element.style.visibility = "visible";
		item.element.style.zIndex = String(2 + item.index);
		item.dropped = true;
		Composite.add(engine.world, item.body);
	}

	let dropTimers = [];

	function scheduleDrops() {
		dropTimers = items.map((item, index) =>
			window.setTimeout(() => drop(item), index * params.dropInterval),
		);
	}

	function replayDrops() {
		for (const timer of dropTimers) window.clearTimeout(timer);
		settled = false;
		engine.gravity.y = params.gravity;

		for (const item of items) {
			if (item.dropped) Composite.remove(engine.world, item.body);
			Body.setStatic(item.body, false);
			Body.setAngle(item.body, 0);
			Body.setAngularVelocity(item.body, 0);
			Body.setVelocity(item.body, { x: 0, y: 0 });
			Sleeping.set(item.body, false);
			item.body.restitution = params.restitution;
			item.body.frictionAir = params.frictionAir;
			item.dropped = false;
			item.locked = false;
			item.calm = 0;
			item.fade = 0;
			item.element.style.visibility = "hidden";
			item.element.style.opacity = "0";
			item.element.style.zIndex = "";
			remeasure(item);
		}

		scheduleDrops();
		resume();
	}

	replay = replayDrops;

	window.addEventListener("resize", () => {
		cancelAnimationFrame(resizeFrame);
		resizeFrame = requestAnimationFrame(() => {
			for (const item of items) remeasure(item);
		});
	});

	document.addEventListener("visibilitychange", () => {
		if (document.hidden) pause();
		else resume();
	});

	const stageObserver = new IntersectionObserver(([entry]) => {
		stageInView = entry.isIntersecting;
		if (stageInView) resume();
		else pause();
	});
	stageObserver.observe(stage);

	window.addEventListener("pagehide", () => {
		for (const timer of dropTimers) window.clearTimeout(timer);
		cancelAnimationFrame(resizeFrame);
		pause();
		stageObserver.disconnect();
	});

	scheduleDrops();
	resume();

	function remeasure(item) {
		const previous = item.home;
		measure(item);
		const next = item.home;

		if (previous.width > 0 && previous.height > 0 && next.width > 0 && next.height > 0) {
			const sx = next.width / previous.width;
			const sy = next.height / previous.height;
			if (Math.abs(sx - 1) > 0.001 || Math.abs(sy - 1) > 0.001) {
				Body.scale(item.body, sx, sy);
			}
		}

		Composite.remove(engine.world, item.shelf);
		item.shelf = createShelf(item.home, item.group);
		Composite.add(engine.world, item.shelf);

		if (item.locked) {
			placeHome(item);
			applyTransform(item);
			return;
		}

		if (!item.dropped) return;

		item.spawnY = next.y - next.height * params.dropDistance;
		pinHorizontal(item);
		applyTransform(item);
	}
}

function shouldLock(item) {
	const spin = Body.getAngularSpeed(item.body);
	const nearFloor = item.body.position.y > item.home.y - 12;
	const calm = nearFloor && (item.body.isSleeping || (Math.abs(item.body.velocity.y) < 0.7 && spin < 0.15));

	if (!nearFloor && item.body.isSleeping) Sleeping.set(item.body, false);

	item.calm = calm ? item.calm + 1 : 0;
	return nearFloor && (item.body.isSleeping || item.calm >= params.lockFrames);
}

function lockItem(item) {
	Body.setVelocity(item.body, { x: 0, y: 0 });
	Body.setAngularVelocity(item.body, 0);
	Body.setAngle(item.body, 0);
	placeHome(item);
	Body.setStatic(item.body, true);
	item.locked = true;
	item.element.style.zIndex = "";
	item.element.style.opacity = "1";
	applyTransform(item);
}

function placeHome(item) {
	Body.setPosition(item.body, { x: item.home.x, y: item.home.y });
}

function createItem(element, index) {
	const group = index + 1;
	const item = {
		element,
		index,
		group,
		home: { x: 0, y: 0, width: 0, height: 0 },
		body: null,
		shelf: [],
		dropped: false,
		locked: false,
		calm: 0,
		fade: 0,
		spawnY: 0,
	};

	measure(item);
	item.body = Bodies.rectangle(item.home.x, item.home.y, item.home.width, item.home.height, {
		restitution: params.restitution,
		friction: 0.25,
		frictionStatic: 0.4,
		frictionAir: params.frictionAir,
		density: 0.0016,
		sleepThreshold: 40,
		collisionFilter: collisionFilter(group),
	});
	item.shelf = createShelf(item.home, group);
	return item;
}

function createShelf(home, group) {
	const floorTop = home.y + home.height / 2;
	const floorWidth = home.width + home.height;

	return [
		Bodies.rectangle(home.x, floorTop + WALL_THICKNESS / 2, floorWidth, WALL_THICKNESS, {
			isStatic: true,
			restitution: params.restitution,
			friction: 0.25,
			frictionStatic: 0.4,
			collisionFilter: collisionFilter(group),
		}),
	];
}

function initialAngle(index) {
	const direction = index % 2 === 0 ? -1 : 1;
	const scale = 1 + (index % 3) * 0.15625;
	return direction * ((params.angle * Math.PI) / 180) * scale;
}

function pinHorizontal(item) {
	Body.setPosition(item.body, { x: item.home.x, y: item.body.position.y });
	Body.setVelocity(item.body, { x: 0, y: item.body.velocity.y });
}

function collisionFilter(group) {
	return {
		group,
		category: 0x0001,
		mask: 0x0000,
	};
}

function measure(item) {
	const { element } = item;
	item.home = {
		x: element.offsetLeft + element.offsetWidth / 2,
		y: element.offsetTop + element.offsetHeight / 2,
		width: element.offsetWidth,
		height: element.offsetHeight,
	};
}

function applyTransform(item) {
	const y = item.body.position.y - item.home.y;
	const span = item.home.y - item.spawnY;
	const progress = span === 0 ? 1 : (item.body.position.y - item.spawnY) / span;
	item.fade = Math.max(item.fade, Math.min(1, Math.max(0, progress)));
	item.element.style.opacity = String(item.fade);
	item.element.style.transform = `translate3d(0px, ${y}px, 0) rotate(${item.body.angle}rad)`;
}

function mountPane() {
	if (stage.dataset.physics !== "on") return;

	const pane = new Pane({ title: "調整" });
	let resetting = false;
	const onMotion = (event) => {
		if (resetting || !event.last) return;
		replay();
	};

	pane.addBinding(params, "angle", { label: "傾き（度）", min: 0, max: 25, step: 0.1 }).on("change", onMotion);
	pane.addBinding(params, "restitution", { label: "反発", min: 0, max: 1, step: 0.01 }).on("change", onMotion);
	pane.addBinding(params, "dropDistance", { label: "落ち始めの高さ", min: 0, max: 3, step: 0.05 }).on("change", onMotion);
	pane.addBinding(params, "gravity", { label: "重力", min: 0, max: 3, step: 0.05 }).on("change", onMotion);
	pane.addBinding(params, "frictionAir", { label: "空気抵抗", min: 0, max: 0.05, step: 0.001 }).on("change", onMotion);
	pane.addBinding(params, "dropInterval", { label: "落下の間隔", min: 0, max: 800, step: 10 }).on("change", onMotion);
	pane.addBinding(params, "lockFrames", { label: "止まるまでのフレーム", min: 1, max: 90, step: 1 }).on("change", onMotion);
	pane.addButton({ title: "もう一度落とす" }).on("click", () => replay());
	pane.addButton({ title: "初期状態に戻す" }).on("click", () => {
		Object.assign(params, defaults);
		resetting = true;
		pane.refresh();
		resetting = false;
		replay();
	});
}
