import { daysInMonth, toISO, evaluateMonth } from "../rules.js";
import { assignmentKey } from "../data.js";

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
        <div class="page-desc">セルをクリックして勤務パターンを割り当てます。希望休は日付見出しではなくセルの右クリックで登録できます。</div>
      </div>
      <div class="header-actions">
        <div class="month-nav">
          <button class="btn btn-ghost btn-sm" id="prev-month">←</button>
          <span class="label">${month.year} / ${String(month.month).padStart(2,"0")}</span>
          <button class="btn btn-ghost btn-sm" id="next-month">→</button>
        </div>
        <button class="btn" id="btn-print">🖨 印刷 / PDF</button>
      </div>
    </div>

    <div class="schedule-scroll">
      <table class="schedule-table">
        <thead>
          <tr>
            <th class="staff-col">職員</th>
            ${days.map((d) => {
              const wd = new Date(month.year, month.month - 1, d).getDay();
              const cls = wd === 0 ? "sun-col" : wd === 6 ? "sat-col" : "";
              const dateISO = toISO(month.year, month.month, d);
              return `<th class="${cls}" style="min-width:46px;">${d}<br><span style="color:var(--text-faint);font-weight:400;">${WEEKDAY_JA[wd]}</span>${warnDates.has(dateISO) ? '<br><span style="color:var(--danger);">●</span>' : ""}</th>`;
            }).join("")}
          </tr>
        </thead>
        <tbody>
          ${state.staff.map((s) => `
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
                if (requested) selClass += " requested";
                return `<td class="cell-wrap ${cls}" style="${hasWarn ? "box-shadow: inset 0 0 0 1px var(--danger);" : ""}" data-staff="${s.id}" data-date="${dateISO}">
                  <select class="${selClass}" data-staff="${s.id}" data-date="${dateISO}" title="${requested ? "希望休あり" : ""}">
                    <option value="" ${!val?"selected":""}>・</option>
                    ${state.patterns.map((p) => `<option value="${p.id}" ${val===p.id?"selected":""}>${p.name}</option>`).join("")}
                    <option value="OFF" ${val==="OFF"?"selected":""}>公休</option>
                    <option value="PAID" ${val==="PAID"?"selected":""}>年休</option>
                  </select>
                </td>`;
              }).join("")}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="legend">
      <span><i style="background:var(--accent-soft);"></i> 勤務あり</span>
      <span><i style="background:var(--bg-elev-3);"></i> 公休/年休</span>
      <span><i style="background:transparent;border:2px solid var(--warn);"></i> 希望休申請あり（右クリックで切替）</span>
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

  container.querySelectorAll("td.cell-wrap").forEach((td) => {
    td.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const key = assignmentKey(td.dataset.staff, td.dataset.date);
      if (state.requestedOff[key]) delete state.requestedOff[key];
      else state.requestedOff[key] = true;
      ctx.save();
      ctx.rerender();
    });
  });

  container.querySelector("#btn-print").addEventListener("click", () => window.print());
  container.querySelector("#prev-month").addEventListener("click", () => ctx.changeMonth(-1));
  container.querySelector("#next-month").addEventListener("click", () => ctx.changeMonth(1));
}

export { render };
