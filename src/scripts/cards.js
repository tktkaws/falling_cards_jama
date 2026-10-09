export const cards = [
	{
		date: "Jun. 2025",
		tags: ["Accessibility"],
		title: "DHS Trusted Tester Certificationを取得",
		bg: "#1f4d3a",
	},
	{
		date: "Aug. 2025",
		tags: ["WordPress", "Security"],
		title: "WordPressの最低限のセキュリティ対策",
		bg: "#243048",
	},
	{
		date: "Nov. 2025",
		tags: ["CSS", "JavaScript"],
		title: "prefers-reduced-motionについて調べてみた",
		bg: "#8c3d2f",
	},
	{
		date: "Jan. 2026",
		tags: ["Accessibility"],
		title: "なぜデジタル庁のフォーカスインジケーターは黄色なのか",
		bg: "#3d4a55",
	},
	{
		date: "Jul. 2026",
		tags: ["JavaScript"],
		title: "Astro × microCMS でブログを作る",
		bg: "#6b4a2e",
	},
	{
		date: "Sep. 2026",
		tags: ["JavaScript", "CSS"],
		title: "GSAPでSpotify風のUIを作ってみた",
		bg: "#1c3f5a",
	},
];

export function imageSrc(card) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="400" viewBox="0 0 860 400"><rect width="860" height="400" fill="${card.bg}"/></svg>`;
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
