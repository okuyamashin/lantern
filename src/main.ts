import records from "../data/adventurers.json";
import world from "../data/world.json";
import { authEnabled, authHeaders, canDraw, currentSession, login, logout, restoreSession } from "./auth.ts";
import { isGuildEmail } from "./guild.ts";
import type { Job } from "./jobs/types.ts";
import type { Adventure, AdventureSummary, Adventurer } from "./types.ts";
import "./style.css";

type Screen = "roster" | "generating" | "play" | "result";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("#app がありません");
}
const app = root;
const apiBase = String(import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
type BgmTrack = "guild-board" | "before-the-road" | "lantern-road";

const bgm = new Audio("/bgm/guild-board.mp3");
bgm.loop = true;
bgm.preload = "auto";
bgm.volume = 0.28;
bgm.dataset.bgm = "guild-board";
document.body.append(bgm);
const voice = new Audio();
voice.preload = "auto";
voice.dataset.voice = "narration";
document.body.append(voice);
voice.addEventListener("ended", () => {
  if (state.screen !== "play") {
    bgm.volume = 0.28;
    return;
  }
  nextScene();
});

function api(path: string): string {
  return `${apiBase}${path}`;
}

const state = {
  screen: "roster" as Screen,
  cards: [] as Adventurer[],
  archive: [] as AdventureSummary[],
  party: [] as Adventurer[],
  status: "",
  error: "",
  adventure: null as Adventure | null,
  page: 0,
  poll: 0,
  turning: false,
  bgmMuted: false,
};

init().catch((error) => {
  state.error = error instanceof Error ? error.message : "読み込みに失敗しました";
  render();
});

async function init(): Promise<void> {
  try {
    await restoreSession();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "ログインに失敗しました";
  }
  state.cards = localCards();
  const remoteCards = await readApiJson<Adventurer[]>(api("/api/adventurers"));
  if (remoteCards?.length) {
    state.cards = remoteCards;
  }
  state.archive = (await readApiJson<AdventureSummary[]>(api("/api/adventures"))) ?? [];
  render();
  useBgm("guild-board");
}

function localCards(): Adventurer[] {
  return records.map((card) => ({
    ...card,
    portrait: `/cards/${card.id}.jpg`,
  }));
}

async function readApiJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.includes("application/json")) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function render(): void {
  app.innerHTML = `
    <div class="frame">
      <header class="masthead">
        ${cornerButton()}
        <div class="auth-bar">${authBar()}</div>
        <p class="eyebrow">紙芝居</p>
        <h1>灯りの四人</h1>
      </header>
      ${view()}
    </div>
  `;
  bind();
}

function view(): string {
  if (state.screen === "generating") {
    return `
      <section class="panel generating">
        <p class="status">${escapeHtml(state.status || "準備しています")}</p>
        <p class="hint">絵は一枚ずつ描きます。数分かかることがあります。</p>
        ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ""}
      </section>
    `;
  }

  if (state.screen === "play" && state.adventure) {
    const scene = state.adventure.scenes[state.page];
    const total = state.adventure.scenes.length;
    return `
      <section class="stage" data-action="next-scene">
        <div class="stage-frame">
          <img class="scene-art is-back" src="${escapeHtml(scene.imagePath)}" alt="" />
          <img class="scene-art is-front" src="${escapeHtml(scene.imagePath)}" alt="" />
        </div>
        <div class="caption">
          <p class="count">${state.page + 1} / ${total}</p>
          <p class="subtitle">${escapeHtml(adventureSubtitle(state.adventure))}</p>
          <p class="line">${escapeHtml(scene.caption)}</p>
          <p class="hint">読み終わると次へ</p>
        </div>
      </section>
    `;
  }

  if (state.screen === "result" && state.adventure) {
    const end = "旅は続いた";
    return `
      <section class="panel result">
        <p class="eyebrow">${end}</p>
        <h2>${escapeHtml(state.adventure.title)}</h2>
        <p class="subtitle">${escapeHtml(adventureSubtitle(state.adventure))}</p>
        <div class="actions">
          <button type="button" class="ghost" data-action="replay">最初から見る</button>
          <button type="button" class="primary" data-action="home">一覧へ</button>
        </div>
        ${archiveView()}
      </section>
    `;
  }

  return `
    <section class="panel">
      <p class="lead">${escapeHtml(rosterLead())}</p>
      <div class="actions">
        ${
          canDraw()
            ? `<button type="button" class="primary" data-action="draw">四人を引く</button>`
            : ""
        }
        ${
          canDraw() && state.party.length === 4
            ? `<button type="button" class="ghost" data-action="start">出発する</button>`
            : ""
        }
      </div>
      ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ""}
      ${
        state.party.length
          ? `<h2 class="sub">今夜のパーティ</h2>
             <div class="party">${state.party.map((card) => cardView(card, true)).join("")}</div>`
          : ""
      }
      ${archiveView()}
      <h2 class="sub">冒険者たち</h2>
      <div class="roster">${state.cards.map((card) => cardView(card, false)).join("")}</div>
    </section>
  `;
}

function cornerButton(): string {
  if (state.screen === "play") {
    return `<button type="button" class="ghost home-button" data-action="home">一覧へ</button>`;
  }
  if (state.screen === "roster" || state.screen === "generating") {
    const label = state.bgmMuted ? "音楽を戻す" : "音楽を止める";
    return `<button type="button" class="ghost home-button" data-action="bgm">${label}</button>`;
  }
  return "";
}

function rosterLead(): string {
  if (canDraw()) {
    return "十二人の冒険者から四人を引き、場所と敵を決めて紙芝居を作ります。旅の結末は成功です。";
  }
  return "夜のギルドに、四人の旅が紙芝居で貼ってあります。絵と語りだけで進み、勝ち戻った話だけが壁に残ります。";
}

function authBar(): string {
  if (!authEnabled()) {
    return "";
  }
  const session = currentSession();
  if (!session) {
    return `<button type="button" class="ghost auth-button" data-action="login">Googleで入る</button>`;
  }
  const label = isGuildEmail(session.email) ? session.email : "閲覧のみ";
  return `
    <span class="auth-who">${escapeHtml(label)}</span>
    <button type="button" class="ghost auth-button" data-action="logout">出る</button>
  `;
}

function archiveView(): string {
  if (state.archive.length === 0) {
    return "";
  }
  return `
    <h2 class="sub">ギルドの掲示板</h2>
    <div class="board" aria-label="依頼メモ">
      ${state.archive.map((item) => memoView(item)).join("")}
      ${decoMemos()}
    </div>
  `;
}

function memoView(item: AdventureSummary): string {
  const sketch = memoSketch(item);
  const enemy = memoEnemyName(item);
  const place = memoPlaceName(item);
  const look = memoLook(item.id);
  return `
    <article class="memo" role="button" tabindex="0" data-action="open" data-id="${escapeHtml(item.id)}" data-paper="${look.paper}" data-pin="${look.pin}" style="${look.style}">
      <span class="memo-pin" aria-hidden="true"></span>
      <span class="memo-tape" aria-hidden="true"></span>
      ${
        sketch
          ? `<img class="memo-sketch" src="${escapeHtml(sketch)}" alt="" />`
          : `<div class="memo-sketch is-blank"></div>`
      }
      <p class="memo-stamp">依頼</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="memo-line">敵　${escapeHtml(enemy || "不明")}</p>
      <p class="memo-line">場　${escapeHtml(place || "不明")}</p>
      <p class="memo-line">受　${escapeHtml(item.partyNames.join("・"))}</p>
      <p class="memo-date">${escapeHtml(formatWhen(item.createdAt))}</p>
    </article>
  `;
}

function decoMemos(): string {
  const scraps = [
    { id: "deco-a", stamp: "済", line: "古い依頼は剥がすこと" },
    { id: "deco-b", stamp: "急", line: "灯の補充、忘れずに" },
    { id: "deco-c", stamp: "覚", line: "四人揃ってから出発" },
  ];
  return scraps
    .map((scrap) => {
      const look = memoLook(scrap.id);
      return `
        <aside class="memo memo-deco" data-paper="${look.paper}" data-pin="${look.pin}" style="${look.style}" aria-hidden="true">
          <span class="memo-pin"></span>
          <p class="memo-stamp">${scrap.stamp}</p>
          <p class="memo-line">${scrap.line}</p>
        </aside>
      `;
    })
    .join("");
}

function memoSketch(item: AdventureSummary): string {
  if (item.coverPath.startsWith("https://")) {
    return item.coverPath;
  }
  if (item.enemyId) {
    return `/enemies/${item.enemyId}.jpg`;
  }
  const enemy = world.enemies.find((entry) => entry.name === memoEnemyName(item));
  if (enemy) {
    return `/enemies/${enemy.id}.jpg`;
  }
  return item.coverPath;
}

function memoEnemyName(item: AdventureSummary): string {
  return item.enemyName || item.subtitle.split(" / ").at(-1) || "";
}

function memoPlaceName(item: AdventureSummary): string {
  return item.placeName || item.subtitle.split(" / ").at(-2) || "";
}

function memoLook(id: string): { style: string; paper: number; pin: number } {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const rotate = (hash % 17) - 8;
  const shiftX = ((hash >>> 5) % 31) - 15;
  const shiftY = ((hash >>> 11) % 25) - 12;
  const paper = (hash >>> 17) % 4;
  const pin = (hash >>> 19) % 3;
  return {
    paper,
    pin,
    style: `--rot:${rotate}deg;--shift-x:${shiftX}px;--shift-y:${shiftY}px`,
  };
}

const CARD_VIDEOS = new Set(["gald", "bren", "ciel", "hana", "iris", "kira", "luca", "merwin", "nok"]);

function cardView(card: Adventurer, selected: boolean): string {
  const chosen = state.party.some((member) => member.id === card.id);
  const video = CARD_VIDEOS.has(card.id);
  return `
    <article class="card ${selected || chosen ? "is-chosen" : ""}">
      <div class="card-frame${video ? " has-video" : ""}" ${video ? `data-action="play-card"` : ""}>
        <img src="${card.portrait}" alt="${escapeHtml(card.name)}" />
        ${
          video
            ? `<video src="/cards/${card.id}.mp4" playsinline preload="none"></video>`
            : ""
        }
      </div>
      <div class="meta">
        <p class="role">${escapeHtml(card.role)}</p>
        <h3>${escapeHtml(card.name)}</h3>
        <p class="trait">${escapeHtml(card.trait)}</p>
      </div>
    </article>
  `;
}

function bind(): void {
  app.querySelectorAll<HTMLElement>("[data-action]").forEach((node) => {
    node.addEventListener("click", (event) => {
      const action = node.dataset.action;
      if (action !== "next-scene") {
        event.stopPropagation();
      }
      if (action === "play-card") {
        playCard(node);
      } else if (action === "bgm") {
        toggleBgm();
      } else if (action === "login") {
        useBgm("guild-board");
        void login();
      } else if (action === "logout") {
        logout();
      } else if (action === "draw") {
        if (!canDraw()) {
          return;
        }
        useBgm("guild-board");
        drawParty();
      } else if (action === "start") {
        if (!canDraw()) {
          return;
        }
        useBgm("before-the-road");
        void startAdventure();
      } else if (action === "next-scene") {
        useBgm("lantern-road");
        nextScene();
      } else if (action === "replay") {
        useBgm("lantern-road");
        state.turning = false;
        state.page = 0;
        state.screen = "play";
        render();
        playNarration();
      } else if (action === "home") {
        stopNarration();
        useBgm("guild-board");
        void goHome();
      } else if (action === "open") {
        event.stopPropagation();
        useBgm("lantern-road");
        void openAdventure(node.dataset.id ?? "");
      }
    });
  });
}

function playCard(frame: HTMLElement): void {
  const video = frame.querySelector("video");
  if (!video) {
    return;
  }
  frame.classList.add("is-playing");
  video.currentTime = 0;
  video.onended = () => {
    frame.classList.remove("is-playing");
  };
  void video.play().catch(() => {
    frame.classList.remove("is-playing");
  });
}

function drawParty(): void {
  const shuffled = [...state.cards].sort(() => Math.random() - 0.5);
  state.party = shuffled.slice(0, 4);
  state.error = "";
  render();
}

async function startAdventure(): Promise<void> {
  if (state.party.length !== 4) {
    return;
  }
  const poll = ++state.poll;
  state.screen = "generating";
  state.status = "順番待ちです";
  state.error = "";
  render();

  try {
    const created = await readApiJson<{ id: string }>(api("/api/jobs"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ cardIds: state.party.map((card) => card.id) }),
    });
    if (!created?.id) {
      throw new Error("生成APIに届いていません。ローカルの npm run dev か、API の公開が必要です。");
    }
    const { id } = created;

    while (poll === state.poll) {
      const job = await readApiJson<Job>(api(`/api/jobs/${encodeURIComponent(id)}`));
      if (!job) {
        throw new Error("進捗を取れませんでした。");
      }
      state.status = job.message || "準備しています";
      render();

      if (job.status === "done" && job.adventure) {
        state.adventure = job.adventure;
        state.page = 0;
        state.screen = "play";
        await refreshArchive();
        render();
        useBgm("lantern-road");
        playNarration();
        return;
      }
      if (job.status === "error") {
        throw new Error(job.error || job.message || "生成に失敗しました。");
      }
      await wait(2500);
    }
  } catch (error) {
    if (poll !== state.poll) {
      return;
    }
    state.error = error instanceof Error ? error.message : "生成に失敗しました。";
    state.screen = "roster";
    stopNarration();
    useBgm("guild-board");
    render();
  }
}

function useBgm(track: BgmTrack): void {
  if (bgm.dataset.bgm !== track) {
    bgm.pause();
    bgm.src = `/bgm/${track}.mp3`;
    bgm.dataset.bgm = track;
    bgm.currentTime = 0;
    bgm.volume = 0.28;
  }
  if (state.bgmMuted && track !== "lantern-road") {
    bgm.pause();
    return;
  }
  if (bgm.paused) {
    void bgm.play().catch(() => undefined);
  }
}

function toggleBgm(): void {
  state.bgmMuted = !state.bgmMuted;
  if (state.bgmMuted) {
    bgm.pause();
  } else if (state.screen === "generating") {
    useBgm("before-the-road");
  } else {
    useBgm("guild-board");
  }
  render();
}

function stopBgm(): void {
  bgm.pause();
  bgm.currentTime = 0;
  bgm.volume = 0.28;
}

function playNarration(): void {
  const src = state.adventure?.scenes[state.page]?.audioPath;
  voice.pause();
  preloadNextScene();
  if (!src) {
    bgm.volume = 0.28;
    voice.removeAttribute("src");
    return;
  }
  bgm.volume = 0.12;
  voice.src = src;
  void voice.play().catch(() => undefined);
}

function preloadNextScene(): void {
  const next = state.adventure?.scenes[state.page + 1];
  if (!next?.imagePath) {
    return;
  }
  const image = new Image();
  image.src = next.imagePath;
  void image.decode().catch(() => undefined);
}

function stopNarration(): void {
  voice.pause();
  voice.removeAttribute("src");
  bgm.volume = 0.28;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function refreshArchive(): Promise<void> {
  const items = await readApiJson<AdventureSummary[]>(api("/api/adventures"));
  if (items) {
    state.archive = items;
  }
}

async function goHome(): Promise<void> {
  state.poll += 1;
  state.turning = false;
  state.screen = "roster";
  state.adventure = null;
  state.page = 0;
  state.error = "";
  await refreshArchive();
  render();
}

async function openAdventure(id: string): Promise<void> {
  if (!id) {
    return;
  }
  const adventure = await readApiJson<Adventure>(
    api(`/api/adventures/${encodeURIComponent(id)}`),
  );
  if (!adventure) {
    state.error = "その紙芝居を開けませんでした。";
    render();
    return;
  }
  state.adventure = adventure;
  state.page = 0;
  state.turning = false;
  state.error = "";
  state.screen = "play";
  render();
  playNarration();
}

function adventureSubtitle(adventure: Adventure): string {
  if (adventure.subtitle) {
    return adventure.subtitle;
  }
  return [
    adventure.party.map((card) => card.name).join("・"),
    adventure.place?.name,
    adventure.enemy?.name,
  ]
    .filter(Boolean)
    .join(" / ");
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ja-JP");
}

async function nextScene(): Promise<void> {
  if (!state.adventure || state.turning) {
    return;
  }
  if (state.page >= state.adventure.scenes.length - 1) {
    stopNarration();
    stopBgm();
    state.screen = "result";
    render();
    return;
  }

  const next = state.adventure.scenes[state.page + 1];
  const front = app.querySelector<HTMLImageElement>(".scene-art.is-front");
  const back = app.querySelector<HTMLImageElement>(".scene-art.is-back");
  if (!next || !front || !back) {
    state.page += 1;
    render();
    playNarration();
    return;
  }

  state.turning = true;
  stopNarration();
  back.src = next.imagePath;
  await back.decode().catch(() => undefined);
  if (!state.adventure || state.screen !== "play") {
    state.turning = false;
    return;
  }

  let finished = false;
  const animation = front.animate(
    [
      { transform: "translateX(0)", boxShadow: "-4px 0 8px rgba(0, 0, 0, 0.2)" },
      { transform: "translateX(104%)", boxShadow: "-18px 0 22px rgba(0, 0, 0, 0.5)" },
    ],
    {
      duration: 720,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      fill: "forwards",
    },
  );

  const finish = () => {
    if (finished || !state.adventure) {
      return;
    }
    finished = true;
    window.clearTimeout(timer);
    animation.cancel();
    state.page += 1;
    front.src = next.imagePath;
    front.style.transform = "";
    updatePlayCaption();
    playNarration();
    state.turning = false;
  };

  animation.addEventListener("finish", finish);
  const timer = window.setTimeout(finish, 850);
}

function updatePlayCaption(): void {
  if (!state.adventure) {
    return;
  }
  const scene = state.adventure.scenes[state.page];
  const count = app.querySelector(".caption .count");
  const line = app.querySelector(".caption .line");
  const subtitle = app.querySelector(".caption .subtitle");
  if (count) {
    count.textContent = `${state.page + 1} / ${state.adventure.scenes.length}`;
  }
  if (line && scene) {
    line.textContent = scene.caption;
  }
  if (subtitle) {
    subtitle.textContent = adventureSubtitle(state.adventure);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
