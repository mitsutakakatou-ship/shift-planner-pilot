import { evaluateMonth } from "../rules.js";

function render(container, ctx) {
  const { state, month } = ctx;
  const { warnings, perStaff, daysInMonth } = evaluateMonth(state, month.year, month.month);
  const high = warnings.filter((w) => w.severity === "high").length;
  const medium = warnings.filter((w) => w.severity === "medium").length;

  const totalNightSlots = state.patterns.filter((p) => p.isNight).length;
  const totalStaff = state.staff.length;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">ダッシュボード</div>
        <div class="page-desc">${month.year}年${month.month}月 / ${state.facility.name} — 定員${state.facility.capacity}名・${state.facility.units}ユニット</div>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Staff</div>
        <div class="stat-value">${totalStaff}</div>
        <div class="stat-sub">登録職員数</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Critical Warnings</div>
        <div class="stat-value ${high > 0 ? "danger" : "ok"}">${high}</div>
        <div class="stat-sub">必須要件の未達（今月）</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Soft Warnings</div>
        <div class="stat-value ${medium > 0 ? "" : "ok"}" style="${medium > 0 ? "color:var(--warn)" : ""}">${medium}</div>
        <div class="stat-sub">希望休の未反映など</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Night Patterns</div>
        <div class="stat-value">${totalNightSlots}</div>
        <div class="stat-sub">夜勤区分の登録数</div>
      </div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0;">今月の警告一覧</div>
      ${warnings.length === 0
        ? `<div class="empty-state"><div class="icon">✓</div><div>今月、機械的にチェックできる範囲では警告はありません。</div></div>`
        : `<div class="warning-list">${warnings
            .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1))
            .map((w) => `
              <div class="warning-item ${w.severity}">
                <span class="rule-badge">${w.rule}</span>
                <span>${w.message}</span>
              </div>`).join("")}</div>`}
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0;">職員別 月間サマリー（${daysInMonth}日換算）</div>
      <table>
        <thead><tr><th>職員</th><th>職種</th><th>勤務時間</th><th>時間外</th><th>夜勤回数</th><th>休日数</th></tr></thead>
        <tbody>
          ${state.staff.map((s) => {
            const p = perStaff[s.id];
            const hours = Math.round((p.workMin / 60) * 10) / 10;
            const otHours = Math.round((p.overtimeMin / 60) * 10) / 10;
            return `<tr>
              <td>${s.name}</td>
              <td><span class="tag">${s.role}</span></td>
              <td>${hours}h</td>
              <td style="${otHours > 45 ? "color:var(--danger);font-weight:700" : ""}">${otHours}h</td>
              <td>${p.nightCount}</td>
              <td>${p.offCount + p.paidCount}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

export { render };
