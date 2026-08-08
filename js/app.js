import { loadState, saveState, resetState, defaultState } from "./data.js";
import { isAdminMode, tryEnterAdminMode, exitAdminMode, changeAdminPin } from "./auth.js";
import * as dashboard from "./views/dashboard.js";
import * as staffView from "./views/staff.js";
import * as patternsView from "./views/patterns.js";
import * as scheduleView from "./views/schedule.js";
import * as manualView from "./views/manual.js";

const NAV_ITEMS = [
  { key: "dashboard", label: "ダッシュボード", icon: "◆", view: dashboard },
  { key: "schedule", label: "月間シフト作成", icon: "▦", view: scheduleView },
  { key: "staff", label: "職員マスタ", icon: "◎", view: staffView },
  { key: "patterns", label: "勤務パターン", icon: "◷", view: patternsView },
  { key: "manual", label: "マニュアル", icon: "？", view: manualView },
];

const now = new Date();
const state = loadState();
let route = "dashboard";
const month = { year: now.getFullYear(), month: now.getMonth() + 1 };

const appRoot = document.getElementById("app");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("shift-planner-pilot/theme", theme);
}

function currentTheme() {
  return localStorage.getItem("shift-planner-pilot/theme") ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}

function changeMonth(delta) {
  let m = month.month + delta;
  let y = month.year;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  month.month = m; month.year = y;
  rerender();
}

function ctx() {
  return {
    state,
    month,
    isAdmin: isAdminMode(),
    save: () => saveState(state),
    rerender,
    changeMonth,
  };
}

function renderShell() {
  const admin = isAdminMode();
  appRoot.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">⚡</div>
        <div class="brand-text">
          <div class="name brand-wordmark">爆速シフトくん</div>
          <div class="sub">INSTANT SHIFT SCHEDULING</div>
        </div>
      </div>
      <nav class="nav">
        ${NAV_ITEMS.map((n) => `
          <div class="nav-item ${route===n.key?"active":""}" data-route="${n.key}">
            <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
          </div>`).join("")}
      </nav>
      <div class="sidebar-foot">
        <div class="theme-toggle" id="mode-toggle" title="${admin ? "クリックで職員モードに戻す" : "クリックでPINを入力し管理者モードに切替"}">
          <span>権限</span><span id="mode-label" style="${admin ? "color:var(--warn);font-weight:700;" : ""}">${admin ? "管理者" : "職員（閲覧のみ）"}</span>
        </div>
        ${admin ? `<button class="btn btn-ghost btn-sm" id="btn-change-pin" style="width:100%;">管理者PINを変更</button>` : ""}
        <div class="theme-toggle" id="theme-toggle"><span>Theme</span><span id="theme-label"></span></div>
        ${admin ? `<button class="btn btn-ghost btn-sm" id="btn-reset" style="width:100%;">サンプルデータにリセット</button>` : ""}
        <div class="pilot-badge">PILOT BUILD<br>データはこの端末のブラウザ内にのみ保存されます（サーバー保存なし・認証なし）<br>「管理者モード」は誤操作防止用の簡易的な制限で、本格的なセキュリティではありません。</div>
      </div>
    </aside>
    <main class="main" id="main"></main>
  `;

  appRoot.querySelectorAll("[data-route]").forEach((el) => {
    el.addEventListener("click", () => { route = el.dataset.route; rerender(); });
  });

  const themeToggle = appRoot.querySelector("#theme-toggle");
  const updateThemeLabel = () => {
    appRoot.querySelector("#theme-label").textContent = currentTheme() === "dark" ? "Dark" : "Light";
  };
  updateThemeLabel();
  themeToggle.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    updateThemeLabel();
  });

  appRoot.querySelector("#mode-toggle").addEventListener("click", () => {
    if (isAdminMode()) {
      exitAdminMode();
    } else {
      tryEnterAdminMode(state, () => saveState(state));
    }
    renderShell();
    rerender();
  });

  appRoot.querySelector("#btn-change-pin")?.addEventListener("click", () => {
    changeAdminPin(state, () => saveState(state));
  });

  appRoot.querySelector("#btn-reset")?.addEventListener("click", () => {
    if (!confirm("すべてのデータを消去し、サンプルデータに戻します。よろしいですか？")) return;
    resetState();
    Object.assign(state, defaultState());
    renderShell();
    rerender();
  });
}

function rerender() {
  // ナビの active 状態だけ更新（毎回シェル全体は作り直さない）
  appRoot.querySelectorAll("[data-route]").forEach((el) => {
    el.classList.toggle("active", el.dataset.route === route);
  });
  const main = document.getElementById("main");
  const active = NAV_ITEMS.find((n) => n.key === route) || NAV_ITEMS[0];
  active.view.render(main, ctx());
}

applyTheme(currentTheme());
renderShell();
rerender();
