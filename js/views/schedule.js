import { daysInMonth, toISO, evaluateMonth } from "../rules.js";
import { assignmentKey, allowedPatternIdsFor } from "../data.js";
import { generateMonthlySchedule } from "../schedule-generator.js";

const WEEKDAY_JA = ["日","月","火","水","木","金","土"];

function render(container, ctx) {
  const { state, month } = ctx;
  const nd = daysInMonth(month.year, month.month);
  const { warnings } = evaluateMonth(state, month.year, month.month);
  const warnDates = new Set(warnings.filter((w) => w.date).map((w) => w.date));
  const warnByStaffDate = {};
  warnings.forEach((w) => {
    if (w.date && w.staff) {
      const k = `${w.staff}|${w.date}`;
      warnByStaffDate[k] = (warnByStaffDate[k] || 0) + 1;
    }
  });

  const days = Array.from({ length: nd }, (_, i) => i + 1);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">月間シフト作成</div>
        <div class="page-desc">★ボタンで希望休の申請を切替、プルダウンで勤務パターンを割り当てます。</div>
      </div>
      <div class="header-actions">
        <div class="month-nav">
          <button class="btn btn-ghost btn-sm" id="prev-month">←</button>
          <span class="label">${month.year} / ${String(month.month).padStart(2,"0")}</span>
          <button class="btn btn-ghost btn-sm" id="next-month">→</button>
        </div>
        <button class="btn btn-primary" id="btn-auto">🪄 自動作成</button>
        <button class="btn" id="btn-print">🖨 印刷 / PDF</button>
      </div>
    </div>
    <p class="hint" style="margin-top:-10px;margin-bottom:16px;">
      「自動作成」は<b>空欄のセルだけ</b>を要件（配置基準・資格・夜勤明け休み・11時間インターバル・週40時間・月間休日数など）に沿って埋めます。既に入力済みのセルと希望休は上書きしません。埋められない箇所は空欄のまま残り、ダッシュボードに警告として表示されます。
    </p>

    <div class="schedule-scroll">
      <table class="schedule-table">
        <thead>
          <tr>
            <th class="staff-col">職員</th>
            ${days.map((d) => {
              const wd = new Date(month.year, month.month - 1, d).getDay();
              const cls = wd === 0 ? "sun-col" : wd === 6 ? "sat-col" : "";
              const dateISO = toISO(month.year, month.month, d);
              return `<th class="${cls}" style="min-width:60px;">${d}<br><span style="color:var(--text-faint);font-weight:400;">${WEEKDAY_JA[wd]}</span>${warnDates.has(dateISO) ? '<br><span style="color:var(--danger);">●</span>' : ""}</th>`;
            }).join("")}
          </tr>
        </thead>
        <tbody>
          ${state.staff.map((s) => {
            const allowed = new Set(allowedPatternIdsFor(s, state.patterns));
            return `
            <tr>
              <td class="staff-col">${s.name}<br><span class="tag" style="margin-top:3px;">${s.role}${s.unit ? " / U"+s.unit : ""}</span></td>
              ${days.map((d) => {
                const dateISO = toISO(month.year, month.month, d);
                const key = assignmentKey(s.id, dateISO);
                const val = state.assignments[key] || "";
                const requested = !!state.requestedOff[key];
                const hasWarn = !!warnByStaffDate[`${s.name}|${dateISO}`];
                const wd = new Date(month.year, month.month - 1, d).getDay();
                const cls = wd === 0 ? "sun-col" : wd === 6 ? "sat-col" : "";
                let selClass = "cell-select";
                if (val && val !== "OFF" && val !== "PAID") selClass += " filled";
                if (val === "OFF") selClass += " off";
                if (val === "PAID") selClass += " paid";
                const availablePatterns = state.patterns.filter((p) => allowed.has(p.id) || p.id === val);
                return `<td class="cell-wrap ${cls}" style="${hasWarn ? "box-shadow: inset 0 0 0 1px var(--danger);" : ""}">
                  <div class="cell-inner">
                    <button type="button" class="req-toggle ${requested ? "on" : ""}" data-staff="${s.id}" data-date="${dateISO}" title="${requested ? "希望休の申請を解除する" : "希望休を申請する"}">${requested ? "★" : "☆"}</button>
                    <select class="${selClass}" data-staff="${s.id}" data-date="${dateISO}" title="${requested ? "希望休あり" : ""}">
                      <option value="" ${!val?"selected":""}>・</option>
                      ${availablePatterns.map((p) => `<option value="${p.id}" ${val===p.id?"selected":""}>${p.name}</option>`).join("")}
                      <option value="OFF" ${val==="OFF"?"selected":""}>公休</option>
                      <option value="PAID" ${val==="PAID"?"selected":""}>年休</option>
                    </select>
                  </div>
                </td>`;
              }).join("")}
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div class="legend">
      <span><i style="background:var(--accent-soft);"></i> 勤務あり</span>
      <span><i style="background:var(--bg-elev-3);"></i> 公休/年休</span>
      <span>★ 希望休申請あり（クリックで切替）</span>
      <span><i style="background:var(--danger);"></i> その日/その職員に警告あり（一覧はダッシュボード参照）</span>
    </div>
  `;

  container.querySelectorAll("select.cell-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const key = assignmentKey(sel.dataset.staff, sel.dataset.date);
      if (sel.value) state.assignments[key] = sel.value;
      else delete state.assignments[key];
      ctx.save();
      ctx.rerender();
    });
  });

  container.querySelectorAll("button.req-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = assignmentKey(btn.dataset.staff, btn.dataset.date);
      if (state.requestedOff[key]) delete state.requestedOff[key];
      else state.requestedOff[key] = true;
      ctx.save();
      ctx.rerender();
    });
  });

  container.querySelector("#btn-auto").addEventListener("click", () => {
    if (!confirm(`${month.year}年${month.month}月の未入力セルを、希望休と要件をもとに自動で埋めます。入力済みのセルは変更しません。実行しますか？`)) return;
    const result = generateMonthlySchedule(state, month.year, month.month);
    ctx.save();
    ctx.rerender();
    alert(`自動作成が完了しました。\n新たに割り当てたセル：${result.filledCount}件\n\n残っている警告はダッシュボードで確認してください。要件をすべて満たせず空欄のまま残っている箇所がある場合も、そこに警告が表示されます。`);
  });

  container.querySelector("#btn-print").addEventListener("click", () => window.print());
  container.querySelector("#prev-month").addEventListener("click", () => ctx.changeMonth(-1));
  container.querySelector("#next-month").addEventListener("click", () => ctx.changeMonth(1));
}

export { render };
