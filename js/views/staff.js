function roleTagClass(role) {
  if (role === "看護師") return "tag tag-role-nurse";
  if (role === "児童発達支援管理責任者") return "tag tag-role-kihatsukan";
  if (role === "管理者") return "tag tag-role-manager";
  return "tag";
}

function openStaffModal(ctx, existing) {
  const isEdit = !!existing;
  const s = existing || {
    id: `s_${Date.now()}`, name: "", role: "児童指導員・保育士", unit: 1,
    employment: "常勤", qualified: true, reducedHours: false, reducedHoursLimitMin: 360,
    nightExempt: false, annualPaidLeaveGranted: 10,
  };

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? "職員を編集" : "職員を追加"}</h3>
      <div class="field-row">
        <div class="field" style="flex:2;"><label>氏名</label><input type="text" id="f-name" value="${s.name}"></div>
        <div class="field" style="flex:1;"><label>所属ユニット</label>
          <select id="f-unit">
            <option value="">—</option>
            ${[1,2,3,4].map((u) => `<option value="${u}" ${s.unit == u ? "selected" : ""}>ユニット${u}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field-row" style="margin-top:10px;">
        <div class="field" style="flex:1;"><label>職種</label>
          <select id="f-role">
            ${["児童指導員・保育士","児童発達支援管理責任者","看護師","管理者"].map((r) => `<option ${s.role===r?"selected":""}>${r}</option>`).join("")}
          </select>
        </div>
        <div class="field" style="flex:1;"><label>雇用形態</label>
          <select id="f-employment">
            <option ${s.employment==="常勤"?"selected":""}>常勤</option>
            <option ${s.employment==="非常勤"?"selected":""}>非常勤</option>
          </select>
        </div>
      </div>
      <div class="field-row" style="margin-top:10px;">
        <div class="field" style="flex:1;"><label>年次有給休暇 付与日数（年間）</label><input type="number" id="f-paidleave" value="${s.annualPaidLeaveGranted}" min="0"></div>
        <div class="field" style="flex:1;"><label>育児短時間勤務の上限（分/日）</label><input type="number" id="f-reducedmin" value="${s.reducedHoursLimitMin || 360}" min="0" ${s.reducedHours?"":"disabled"}></div>
      </div>
      <div class="divider"></div>
      <div class="checkbox-row"><input type="checkbox" id="f-qualified" ${s.qualified?"checked":""}> 資格・任用要件を満たしている（配置基準に算入可）</div>
      <div class="checkbox-row" style="margin-top:8px;"><input type="checkbox" id="f-reduced" ${s.reducedHours?"checked":""}> 育児短時間勤務の対象</div>
      <div class="checkbox-row" style="margin-top:8px;"><input type="checkbox" id="f-nightexempt" ${s.nightExempt?"checked":""}> 深夜業免除の対象（育児・介護等）</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="f-cancel">キャンセル</button>
        <button class="btn btn-primary" id="f-save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const reducedCheckbox = backdrop.querySelector("#f-reduced");
  const reducedMinInput = backdrop.querySelector("#f-reducedmin");
  reducedCheckbox.addEventListener("change", () => { reducedMinInput.disabled = !reducedCheckbox.checked; });

  backdrop.querySelector("#f-cancel").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector("#f-save").addEventListener("click", () => {
    const name = backdrop.querySelector("#f-name").value.trim();
    if (!name) { backdrop.querySelector("#f-name").focus(); return; }
    const updated = {
      ...s,
      name,
      unit: backdrop.querySelector("#f-unit").value ? Number(backdrop.querySelector("#f-unit").value) : null,
      role: backdrop.querySelector("#f-role").value,
      employment: backdrop.querySelector("#f-employment").value,
      annualPaidLeaveGranted: Number(backdrop.querySelector("#f-paidleave").value) || 0,
      reducedHoursLimitMin: Number(reducedMinInput.value) || 0,
      qualified: backdrop.querySelector("#f-qualified").checked,
      reducedHours: reducedCheckbox.checked,
      nightExempt: backdrop.querySelector("#f-nightexempt").checked,
    };
    if (isEdit) {
      const idx = ctx.state.staff.findIndex((x) => x.id === s.id);
      ctx.state.staff[idx] = updated;
    } else {
      ctx.state.staff.push(updated);
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
        <div class="page-title">職員マスタ</div>
        <div class="page-desc">氏名・職種・ユニット・資格要件・常勤区分などを管理します</div>
      </div>
      <div class="header-actions"><button class="btn btn-primary" id="btn-add-staff">＋ 職員を追加</button></div>
    </div>
    <div class="card" style="padding:0;">
      <table>
        <thead><tr>
          <th>氏名</th><th>職種</th><th>ユニット</th><th>雇用形態</th><th>資格</th><th>育児短時間</th><th>深夜業免除</th><th>年休付与</th><th></th>
        </tr></thead>
        <tbody>
          ${state.staff.map((s) => `
            <tr>
              <td>${s.name}</td>
              <td><span class="${roleTagClass(s.role)}">${s.role}</span></td>
              <td>${s.unit ? `U${s.unit}` : "—"}</td>
              <td>${s.employment}</td>
              <td>${s.qualified ? "✓" : "—"}</td>
              <td>${s.reducedHours ? "✓" : "—"}</td>
              <td>${s.nightExempt ? "✓" : "—"}</td>
              <td>${s.annualPaidLeaveGranted}日</td>
              <td style="text-align:right;">
                <button class="btn btn-ghost btn-sm" data-edit="${s.id}">編集</button>
                <button class="btn btn-ghost btn-sm" data-del="${s.id}" style="color:var(--danger);">削除</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <p class="hint" style="margin-top:12px;">※本パイロットでは資格の種類は「配置基準に算入可能か」の1フラグで簡略化しています。</p>
  `;

  container.querySelector("#btn-add-staff").addEventListener("click", () => openStaffModal(ctx, null));
  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = state.staff.find((x) => x.id === btn.dataset.edit);
      openStaffModal(ctx, s);
    });
  });
  container.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("この職員を削除しますか？関連するシフト割当も削除されます。")) return;
      const id = btn.dataset.del;
      state.staff = state.staff.filter((x) => x.id !== id);
      Object.keys(state.assignments).forEach((k) => { if (k.startsWith(id + "|")) delete state.assignments[k]; });
      Object.keys(state.requestedOff).forEach((k) => { if (k.startsWith(id + "|")) delete state.requestedOff[k]; });
      ctx.save();
      ctx.rerender();
    });
  });
}

export { render };
