# Falling Cards

カードの画像だけが、それぞれの枠の上からフェードインしながら落ち、跳ねて、枠で止まる UI デモです。ラベル、タグ、名前は動きません。

描画は Canvas ではなく DOM です。Matter.js は当たり判定と重力だけを担当し、見た目の画像枠を毎フレーム `transform` で追従させます。参考にしたのは [seitaro.group](https://seitaro.group/#group) のグループカードで、画像が枠へ落ちて着地する動きです。社名、写真、本文は使っていません。文言と図版はオリジナルです。

物理が動くのは幅 `1024px` 以上の画面だけです。それより狭い画面では、画像は最初から枠の中にあります。

## 使用技術

- Astro
- Matter.js
- Tweakpane
- CSS `transform`（`translate3d` と `rotate`）

## 起動方法

```sh
npm install
npm run dev
```

ブラウザで `http://localhost:4321` を開きます。

ナビゲーションから5つのパターンを切り替えられます。

- `/` — Gallery：単色の通常カード
- `/soft/` — Soft：柔らかく変形するカード
- `/photo/` — Photo：通常カードの全面にUnsplashの風景写真を表示
- `/text/` — Text：落下する通常カードの中央にHTML、CSSなどの文字を表示
- `/timeline/` — Timeline：中央の縦線に沿って、年号と説明文を含むカード全体が左右交互に4枚落下

Timelineは `src/pages/timeline.astro` の `milestones` で年号と説明文を編集できます。中央の線が下へ伸び、左2枚・右2枚が着地します。Tweakpaneから落下を再生でき、狭い画面や動きを抑える設定では静止表示になります。

TimelineでもTweakpaneの「Soft」で通常／柔らかいカードを切り替えられます。年号と説明文がカードの変形に追従し、どちらのモードでも落ち始めの高さは `0.25` が初期値です。

「カードの色」のカラーピッカーで4枚の色を一括変更できます。色はその場で反映され、Soft切り替えもページの再読み込みなしで行えます。「初期状態に戻す」で元の紺色（`#243048`）に戻ります。

### Timelineを別ページに配置する

`src/components/Timeline.astro` にHTML・CSS・動作処理をまとめています。年号と説明文はHTMLのまま表示し、Softでも同じHTMLを動かします。SVGは変形する背景と骨格の描画にだけ使用します。ページ固有のナビや見出しはコンポーネントに含みません。

```astro
---
import Timeline from "../components/Timeline.astro";

const history = [
  { year: "2023", description: "プロジェクトを開始しました。" },
  { year: "2024", description: "最初のサービスを公開しました。" },
];
---

<Timeline items={history} />
```

調整パネルを付ける場合は `<Timeline items={history} showControls />`、最初からSoftにする場合は `soft` を追加します。

| プロパティ | 初期値 | 内容 |
| :--- | :--- | :--- |
| `items` | 必須 | `{ year: string, description: string }` の配列。枚数は自由 |
| `label` | `"タイムライン"` | セクションのアクセシブルな名前 |
| `color` | `"#243048"` | カードの共通色（6桁のHEX形式） |
| `soft` | `false` | 初期の物理モード |
| `showControls` | `false` | コンポーネント内に折りたたみ式Tweakpaneを表示 |
| `dropDistance` | `0.25` | カードの高さに対する落下距離の倍率 |
| `dropInterval` | `320` | カード間の落下開始間隔（ミリ秒） |
| `settingsKey` | 未指定 | 指定すると色・Soft設定をURLに保持。複数配置では異なるキーを指定 |

同じページに複数配置できます。固定IDやページ全体のスタイルへの依存はありません。JavaScriptが無効な場合、幅1024px未満の場合、動きを抑える設定の場合も、通常のHTMLとして読めます。

別のAstroプロジェクトに移す際は、このファイルをコピーし、`npm install matter-js tweakpane` で依存パッケージを追加してください。他のローカルJSファイルは不要です。

### Textを別ページに配置する

`src/components/TextCards.astro` にHTML・CSS・動作処理をまとめています。カード上の文字はHTMLで表示し、カード下の16pxの説明文は固定したままです。Softでも同じHTMLの文字が動き、SVGは背景と骨格の描画にだけ使用します。

```astro
---
import TextCards from "../components/TextCards.astro";

const skills = [
  { label: "HTML", description: "Webページの構造を表現します。", color: "#1f4d3a" },
  { label: "CSS", description: "Webページの見た目を整えます。", color: "#243048" },
];
---

<TextCards items={skills} showControls />
```

| プロパティ | 初期値 | 内容 |
| :--- | :--- | :--- |
| `items` | 必須 | `{ label: string, description: string, color?: string }` の配列。枚数は自由 |
| `label` | `"テキストカード"` | セクションのアクセシブルな名前 |
| `color` | `"#243048"` | 個別色を省略したカードの背景色 |
| `soft` | `false` | 初期の物理モード |
| `showControls` | `false` | 折りたたみ式Tweakpaneを表示 |
| `dropDistance` | `0.85` | カードの高さに対する落下距離の倍率 |
| `dropInterval` | `140` | カード間の落下開始間隔（ミリ秒） |
| `settingsKey` | 未指定 | 指定するとSoft設定をURLに保持。複数配置では異なるキーを指定 |

Soft切り替えはページの再読み込みなしで反映されます。幅1024px未満や動きを抑える設定では静止表示になり、JavaScriptが無効でも本文を読めます。同じページに複数配置したり、Timelineと併用したりできます。

別のAstroプロジェクトへは `TextCards.astro` をコピーし、`npm install matter-js tweakpane` で依存パッケージを追加してください。他のローカルコンポーネントやJSファイルは不要です。

PhotoはGalleryと共通の `src/components/RigidGallery.astro` と `src/scripts/main.js` を使います。写真は `public/images/landscapes/` にJPEGとして保存しているため、表示時にUnsplashへの接続は不要です。撮影者と写真の出典は `src/scripts/landscapes.js` に記録し、Photoページの下部にもリンクを表示しています。

| Command | Action |
| :------ | :----- |
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |

広い画面では、6枚の画像が時間差で、それぞれの枠の上から落ちます。落ち始めは斜めで、落ちながら不透明度が上がります。横にはずれず、枠の中央のまま跳ね、速度が落ちると角度 `0` で枠に揃って止まります。ドラッグはありません。

## ファイル構成

```txt
falling_cards/
├─ src/
│  ├─ pages/
│  │  └─ index.astro       # グリッド、カード、スタイル
│  └─ scripts/
│     ├─ cards.js          # 日付、タグ、タイトル、図版
│     └─ main.js           # Matter.js、棚、落下、静止
└─ package.json
```

## 全体の仕組み

```txt
グリッド上の静止位置
      ↓
画像と同じ矩形の body と、枠ごとの床
      ↓
重力・衝突（Engine / Runner）
      ↓
requestAnimationFrame
      ↓
translate3d + rotate
```

1. `index.astro` がカードをグリッドとして置く
2. `main.js` が各画像枠の位置とサイズを測る
3. 枠ごとに床を置き、画像はその枠の上から 140ms 間隔で落とす
4. 毎フレーム、縦の差分と角度を画像枠の `transform` に書き、落ちる割合で不透明度を上げる
5. 速度が落ちたら中心を枠へ戻し、角度を `0` にして `isStatic` にする
6. 全部が止まったら、シミュレーションと同期の両方を止める

Matter.js は何も描きません。ブラウザが動かすのは、すでに描画済みの画像枠の `transform` だけです。

## カード

1枚は、画像、日付、タグ、下線のタイトルです。全体が `<a href="#">` です。

画像は単色の SVG で、外部の画像 URL は使いません。比率は狭い画面で `35 / 14`、広い画面で `43 / 20`、角は `5px` です。

```html
<a class="card" href="#">
  <div class="pic">…</div>
  <p class="label">Jun. 2025</p>
  <ul class="tags">…</ul>
  <p class="name">DHS Trusted Tester Certificationを取得</p>
</a>
```

動くのは `.pic` だけです。ラベル、タグ、名前は文書の流れのままです。

カードを増やすときは、`cards.js` の `cards` に項目を足します。ページ側はその配列から組み立てます。

## `src/pages/index.astro`

ページの土台です。

- `cards.js` の並びで、6枚のカードをグリッドに出す
- `main.js` を client スクリプトとして読み込む
- `<head>` のインラインスクリプトが、幅 `1024px` 以上で、かつアニメーションを許可しているときだけ `html` に `is-live` を付ける

`is-live` のあいだ、画像枠はいったん非表示で、ビューポートの上にずらしてあります。JavaScript が動く前に枠の位置で見えて、そのあと上へ飛び上がるのを避けるためです。JavaScript が動かない場合は `<noscript>` のスタイルで、画像を枠の中に戻します。

`prefers-reduced-motion: reduce` のときは `is-live` を付けません。画像は最初から枠にあります。

## `src/scripts/cards.js`

見た目の定義です。物理エンジンには依存しません。

```js
export const cards = [ /* … */ ];
export function imageSrc(card) { /* SVG の data URI */ }
```

## `src/scripts/main.js`

デモの中心です。幅が `1024px` 未満、または `prefers-reduced-motion: reduce` のときはここで処理を終え、物理エンジンを作りません。設定か幅の区分が変わったらページを読み直し、オンとオフを切り替えます。

### 1. エンジンと棚

```js
const engine = Engine.create({ enableSleeping: true });
engine.gravity.y = 1.05;
```

床はステージ全体で1枚ではありません。カードごとに、画像枠の下端へ静的な床を置きます。厚さは 220px で、1フレームで突き抜けにくくしています。床の幅は、斜めの画像の角が載るように、枠より画像の高さぶん広くしてあります。

横位置は毎ステップ、枠の中心に戻します。速度の横成分も消すので、落下中も着地後も横へずれません。

### 2. 画像同士は衝突しない

画像と、その画像の床は、同じ正の `collisionFilter.group` を共有します。同じ正のグループは必ず衝突します。別のカードとはグループが違うので、category と mask のルールになります。mask は `0` にしてあるため、別のカードの床とは衝突しません。

画像は画面の上からではなく、自分の枠の上から落ちます。となりの床は通り抜けるので、2段目が1段目の床に着地することはありません。

### 3. 枠の上から落とす

```js
item.spawnY = item.home.y - item.home.height * 0.85;
```

この `spawnY` は body の中心です。枠の中心から、画像の高さの 0.85 倍だけ上に来ます。その分だけ、ヘッダーとリストの間隔も空けてあります。画像は見出しに重ならずに落ち始めます。140ms 間隔で `Composite.add` します。横位置は枠の中央だけです。初期の角度は約 0.04〜0.05rad（およそ 2〜3 度）で、カードごとに左右が交互です。

座標の原点はグリッドの左上です。要素は文書フローに残したまま、静止位置からの差分だけを `transform` にします。

### 4. DOM への同期

```js
const y = item.body.position.y - item.home.y;
const progress = (item.body.position.y - item.spawnY) / (item.home.y - item.spawnY);
element.style.opacity = String(Math.min(1, Math.max(0, progress)));
element.style.transform = `translate3d(0px, ${y}px, 0) rotate(${item.body.angle}rad)`;
```

横の移動量は常に `0` です。縦の進みに合わせて不透明度を `0` から `1` へ上げます。跳ねて上に戻っても、一度上がった不透明度は下げません。`translate3d` と `rotate` は合成レイヤー上で動くので、位置の更新でレイアウトを再計算しません。回転の原点は枠の中心です。

### 5. 止めるタイミング

枠の高さまで戻っていて、縦速度と角速度が小さい状態が 18 フレーム続くか、body が sleep したら固定します。跳ねて浮いているあいだは固定しません。中心を枠へ、角度を `0` に戻し、`isStatic` にします。着地後の見た目は `translate3d(0px, 0px, 0)` で、枠に揃います。

空中で sleep した場合は起こして、落下を続けさせます。

全部が固定されたら `Runner.stop` と `cancelAnimationFrame` で、シミュレーションと同期の両方を止めます。タブが非表示のあいだ、およびグリッドが画面外のあいだも同様に止め、再び表示されたら、まだ落ちているときだけ再開します。

### 6. リサイズ

幅が `1024px` の境界をまたいだらページを読み直します。物理のオンとオフを切り替えるためです。

同じ区分の中で幅が変わったときは、body は作り直さず、測り直した幅と高さの比で `Body.scale` します。床は新しい枠に合わせて置き直し、すでに止まっている画像は新しい中心へ移します。落下中の画像も、横位置は新しい枠の中央です。

画面右上の「調整」から、落下の数値を変えられます。スライダーを離すと最初から落ち直します。「もう一度落とす」でもやり直せます。「初期状態に戻す」は数値を初期値に戻して、もう一度落とします。

## 調整のポイント

| パネル | 初期値 | 内容 |
| :--- | ---: | :--- |
| 傾き（度） | `2.3` | 落ち始めの傾き。カードごとに少しだけ差がある |
| 反発 | `0.34` | 床での跳ね。画像と床の大きい方が使われる |
| 落ち始めの高さ | `0.85` | 枠の中心から、画像の高さの何倍上か |
| 重力 | `1.05` | 落下の強さ |
| 空気抵抗 | `0.006` | 跳ねたあとの収束 |
| 落下の間隔 | `140` | 落ち始める間隔（ms） |
| 止まるまでのフレーム | `18` | 速度が落ちてから枠へ固定するまでのフレーム数 |

- **落ちが速い / 遅い** → 重力を変える
- **弾みすぎる** → 反発を下げる
- **跳ねが見えない** → 反発を上げる
- **揃う前に長い** → 止まるまでのフレームを下げる
- **カードを増やす** → `cards.js` の配列に足す

## 参考

着地の仕方は、セイタロウデザイングループのサイト（[seitaro.group](https://seitaro.group/#group)）を参考にしています。サイトの社名、写真、本文は転載していません。
