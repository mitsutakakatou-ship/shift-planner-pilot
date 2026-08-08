// シフト表の要件チェック（依頼書 No.1〜18 のうち、日次データから機械的に判定できる項目を実装）
// 実装できない/施設側の目視確認が必要な項目は checklistOnly として別扱いにする。

function pad2(n) { return String(n).padStart(2, "0"); }
function toISO(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }
function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
function timeToMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

function patternDurationMin(p) {
  let start = timeToMin(p.start);
  let end = timeToMin(p.end);
  if (end <= start) end += 24 * 60; // 日またぎ（夜勤）
  return end - start - (p.breakMin || 0);
}

function patternNightMinutes(p) {
  // 22:00-翌5:00 に重なる分数を計算
  let start = timeToMin(p.start);
  let end = timeToMin(p.end);
  if (end <= start) end += 24 * 60;
  const nightStart = 22 * 60;
  const nightEnd = 24 * 60 + 5 * 60;
  const overlapStart = Math.max(start, nightStart);
  const overlapEnd = Math.min(end, nightEnd);
  return Math.max(0, overlapEnd - overlapStart);
}

function monthlyHolidayThreshold(days) {
  if (days >= 31) return 10;
  if (days === 30) return 9;
  return 8;
}

function evaluateMonth(state, year, month) {
  const { staff, patterns, assignments, requestedOff, facility } = state;
  const patternMap = Object.fromEntries(patterns.map((p) => [p.id, p]));
  const nd = daysInMonth(year, month);
  const warnings = [];
  const perStaff = Object.fromEntries(staff.map((s) => [s.id, {
    workMin: 0, nightMin: 0, overtimeMin: 0, nightCount: 0, offCount: 0, paidCount: 0,
  }]));

  const cellOf = (staffId, dateISO) => assignments[`${staffId}|${dateISO}`];

  // --- 日次チェック（配置基準・資格者・児発管・夜間配置） ---
  for (let d = 1; d <= nd; d++) {
    const dateISO = toISO(year, month, d);
    for (const p of patterns) {
      const assignedStaff = staff.filter((s) => cellOf(s.id, dateISO) === p.id);
      if (p.requiredCount && assignedStaff.length < p.requiredCount) {
        warnings.push({ rule: p.isNight ? "6.夜間配置" : "1.配置基準", date: dateISO, severity: "high",
          message: `${dateISO} ${p.name}：必要人数 ${p.requiredCount} 名に対し ${assignedStaff.length} 名` });
      }
      if (p.requiredQualifiedCount) {
        const qualified = assignedStaff.filter((s) => s.qualified).length;
        if (qualified < p.requiredQualifiedCount) {
          warnings.push({ rule: "2.資格", date: dateISO, severity: "high",
            message: `${dateISO} ${p.name}：資格者 ${p.requiredQualifiedCount} 名必要に対し ${qualified} 名` });
        }
      }
    }
    // 児発管：当日いずれかの勤務に1名以上
    const kihatsukanWorking = staff.some((s) => s.role === "児童発達支援管理責任者" &&
      patternMap[cellOf(s.id, dateISO)]);
    if (!kihatsukanWorking) {
      warnings.push({ rule: "4.児発管", date: dateISO, severity: "high", message: `${dateISO}：児童発達支援管理責任者が配置されていません` });
    }
  }

  // --- 職員ごとの集計・週次/連続日チェック ---
  for (const s of staff) {
    let consecutiveNoOff = 0;
    let lastShiftEnd = null; // {dateIndex, endAbsMin}
    for (let d = 1; d <= nd; d++) {
      const dateISO = toISO(year, month, d);
      const cell = cellOf(s.id, dateISO);
      const pattern = patternMap[cell];

      if (cell === "OFF" || cell === "PAID" || !cell) {
        if (cell === "OFF") perStaff[s.id].offCount++;
        if (cell === "PAID") perStaff[s.id].paidCount++;
        if (cell) consecutiveNoOff = 0;
      }

      // 希望休が反映されていない
      if (requestedOff[`${s.id}|${dateISO}`] && pattern) {
        warnings.push({ rule: "希望休", date: dateISO, staff: s.name, severity: "medium",
          message: `${dateISO} ${s.name}：希望休が申請されていますが勤務が割り当てられています` });
      }

      if (pattern) {
        consecutiveNoOff++;
        const dur = patternDurationMin(pattern);
        perStaff[s.id].workMin += dur;
        perStaff[s.id].nightMin += patternNightMinutes(pattern);
        if (pattern.isNight) perStaff[s.id].nightCount++;
        if (dur > 8 * 60) perStaff[s.id].overtimeMin += dur - 8 * 60;

        // 深夜業免除対象者が深夜時間帯を含む勤務に割当て
        if (s.nightExempt && patternNightMinutes(pattern) > 0) {
          warnings.push({ rule: "18.深夜制限", date: dateISO, staff: s.name, severity: "high",
            message: `${dateISO} ${s.name}：深夜業免除対象者ですが深夜時間帯を含む勤務が割り当てられています` });
        }
        // 育児短時間勤務の上限超過
        if (s.reducedHours && dur > (s.reducedHoursLimitMin || 0)) {
          warnings.push({ rule: "17.育児等", date: dateISO, staff: s.name, severity: "high",
            message: `${dateISO} ${s.name}：育児短時間勤務の上限（${Math.round((s.reducedHoursLimitMin||0)/60*10)/10}h）を超える勤務が割り当てられています` });
        }

        // 夜勤明けの翌日は休みか
        if (pattern.isNight && d < nd) {
          const nextISO = toISO(year, month, d + 1);
          const nextCell = cellOf(s.id, nextISO);
          if (nextCell && nextCell !== "OFF" && nextCell !== "PAID") {
            warnings.push({ rule: "夜勤明け", date: nextISO, staff: s.name, severity: "high",
              message: `${nextISO} ${s.name}：夜勤明けの翌日に勤務が割り当てられています` });
          }
        }

        // 勤務間インターバル11時間
        const startAbs = (d - 1) * 24 * 60 + timeToMin(pattern.start);
        let endAbs = (d - 1) * 24 * 60 + timeToMin(pattern.end);
        if (timeToMin(pattern.end) <= timeToMin(pattern.start)) endAbs += 24 * 60;
        if (lastShiftEnd !== null) {
          const gap = startAbs - lastShiftEnd;
          if (gap < 11 * 60 && gap >= 0) {
            warnings.push({ rule: "インターバル", date: dateISO, staff: s.name, severity: "high",
              message: `${dateISO} ${s.name}：直前勤務からのインターバルが11時間未満（約${Math.round(gap/60*10)/10}h）` });
          }
        }
        lastShiftEnd = endAbs;
      } else {
        consecutiveNoOff = 0;
      }

      if (consecutiveNoOff >= 7) {
        warnings.push({ rule: "11.休日", date: dateISO, staff: s.name, severity: "high",
          message: `${dateISO} ${s.name}：7日以上連続勤務（週1日/4週4日の休日が確保できていません）` });
        consecutiveNoOff = 0; // 重複警告を避けるためリセット
      }
    }

    // 月間休日数
    const threshold = monthlyHolidayThreshold(nd);
    const totalOff = perStaff[s.id].offCount + perStaff[s.id].paidCount;
    if (totalOff < threshold) {
      warnings.push({ rule: "月間休日数", staff: s.name, severity: "medium",
        message: `${s.name}：月間休日数 ${totalOff} 日（目安 ${threshold} 日を下回っています）` });
    }

    // 時間外労働の36協定上限
    if (perStaff[s.id].overtimeMin > facility.overtimeMonthlyCapMin) {
      warnings.push({ rule: "13.時間外上限", staff: s.name, severity: "high",
        message: `${s.name}：月間時間外時間が上限（${facility.overtimeMonthlyCapMin/60}h）を超過（約${Math.round(perStaff[s.id].overtimeMin/60*10)/10}h）` });
    }
  }

  return { warnings, perStaff, daysInMonth: nd };
}

export { evaluateMonth, patternDurationMin, patternNightMinutes, daysInMonth, toISO, monthlyHolidayThreshold };
