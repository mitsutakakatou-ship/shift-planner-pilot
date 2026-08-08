import { allowedPatternIdsFor } from "../data.js";

const MAX_PATTERNS = 10;

function openPatternModal(ctx, existing) {
  const isEdit = !!existing;
  const p = existing || { id: `p_${Date.now()}`, name: "", start: "09:00", end: "18:00", breakMin: 60, requiredCount: 1, requiredQualifiedCount: 0, isNight: false };

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? "勤務パターンを編集" : "勤務パターンを追加"}</h3>
      <div class="field"><label>名称</label><input type="text" id="f-name" value="${p.name}"></div>
      <div class="field-row" style="margin-top:10px;">
        <div class="field" style="flex:1;"><label>開始時刻</label><input type="time" id="f-start" value="${p.start}"></div>
        <div class="field" style="flex:1;"><label>終了時刻（日またぎ可）</label><input type="time" id="f-end" value="${p.end}"></div>
        <div class="field" style="flex:1;"><label>休憩（分）</label><input type="number" id="f-break" value="${p.breakMin}" min="0"></div>
      </div>
      <div class="field-row" style="margin-top:10px;">
        <div class="field" style="flex:1;"><label>必要人数</label><input type="number" id="f-required" value="${p.requiredCount}" min="0"></div>
        <div class="field" style="flex:1;"><label>うち資格者 最低人数</label><input type="number" id="f-reqqualified" value="${p.requiredQualifiedCount}" min="0"></div>
      </div>
      <div class="checkbox-row" style="margin-top:12px;"><input type="checkbox" id="f-night" ${p.isNight?"checked":""}> 夜間（夜勤）区分として扱う</div>
      <p class="hint" style="margin-top:10px;">6時間超の勤務は休憩45分以上、8時間超は60分以上が必要です（労基法）。</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="f-cancel">キャンセル</button>
        <button class="btn btn-primary" id="f-save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector("#f-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#f-save").addEventListener("click", () => {
    const name = backdrop.querySelector("#f-name").value.trim();
    if (!name) { backdrop.querySelector("#f-name").focus(); return; }
    const start = backdrop.querySelector("#f-start").value;
    const end = backdrop.querySelector("#f-end").value;
    const breakMin = Number(backdrop.querySelector("#f-break").value) || 0;

    let s = start.split(":").map(Number), e = end.split(":").map(Number);
    let durMin = (e[0]*60+e[1]) - (s[0]*60+s[1]);
    if (durMin <= 0) durMin += 24*60;
    const requiredBreak = durMin > 8*60 ? 60 : durMin > 6*60 ? 45 : 0;
    if (breakMin < requiredBreak) {
      if (!confirm(`この勤務時間（約${Math.round(durMin/60*10)/10}h）には休憩${requiredBreak}分以上が必要です（労基法 No.10）。このまま保存しますか？`)) return;
    }

    const updated = {
      ...p, name, start, end, breakMin,
      requiredCount: Number(backdrop.querySelector("#f-required").value) || 0,
      requiredQualifiedCount: Number(backdrop.querySelector("#f-reqqualified").value) || 0,
      isNight: backdrop.querySelector("#f-night").checked,
    };
    if (isEdit) {
      const idx = ctx.state.patterns.findIndex((x) => x.id === p.id);
      ctx.state.patterns[idx] = updated;
    } else {
      if (ctx.state.patterns.length >= MAX_PATTERNS) { alert(`勤務パターンは最大${MAX_PATTERNS}種類までです。`); return; }
      // 新規パターンは全職員の「対応可能」に初期反映する（個別に対応外へ変更は職員マスタで可能）
      // ※未設定（旧データ＝全対応扱い）の職員は、現状の全パターンで明示化してから新パターンを足す
      ctx.state.staff.forEach((s) => {
        s.allowedPatternIds = [...allowedPatternIdsFor(s, ctx.state.patterns), updated.id];
      });
      ctx.state.patterns.push(updated);
    }
    ctx.save();
    backdrop.remove();
    ctx.rerender();
  });
}

function render(container, ctx) {
  const { state } = ctx;
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">勤務パターン</div>
        <div class="page-desc">最大${MAX_PATTERNS}種類まで登録できます（現在 ${state.patterns.length} 件）</div>
      </div>
      <div class="header-actions"><button class="btn btn-primary" id="btn-add-pattern" ${state.patterns.length >= MAX_PATTERNS ? "disabled" : ""}>＋ パターンを追加</button></div>
    </div>
    <div class="card" style="padding:0;">
      <table>
        <thead><tr><th>名称</th><th>時間帯</th><th>休憩</th><th>必要人数</th><th>資格者最低人数</th><th>夜間</th><th></th></tr></thead>
        <tbody>
          ${state.patterns.map((p) => `
            <tr>
              <td>${p.name}</td>
              <td>${p.start}–${p.end}</td>
              <td>${p.breakMin}分</td>
              <td>${p.requiredCount}名</td>
              <td>${p.requiredQualifiedCount}名</td>
              <td>${p.isNight ? "🌙" : "—"}</td>
              <td style="text-align:right;">
                <button class="btn btn-ghost btn-sm" data-edit="${p.id}">編集</button>
                <button class="btn btn-ghost btn-sm" data-del="${p.id}" style="color:var(--danger);">削除</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  container.querySelector("#btn-add-pattern")?.addEventListener("click", () => openPatternModal(ctx, null));
  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openPatternModal(ctx, state.patterns.find((x) => x.id === btn.dataset.edit)));
  });
  container.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("この勤務パターンを削除しますか？割り当て済みのシフトも削除されます。")) return;
      const id = btn.dataset.del;
      state.patterns = state.patterns.filter((x) => x.id !== id);
      Object.keys(state.assignments).forEach((k) => { if (state.assignments[k] === id) delete state.assignments[k]; });
      state.staff.forEach((s) => { if (s.allowedPatternIds) s.allowedPatternIds = s.allowedPatternIds.filter((pid) => pid !== id); });
      ctx.save();
      ctx.rerender();
    });
  });
}

export { render };
