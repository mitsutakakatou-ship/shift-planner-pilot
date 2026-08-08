// 希望休・既存の割当を尊重しつつ、未設定のセルだけを要件に沿って自動で埋める。
// 方針：欠員が出る場合も無理に辻褄を合わせず空欄のまま残し、ダッシュボードの警告に委ねる。
import { daysInMonth, toISO, monthlyHolidayThreshold, patternDurationMin } from "./rules.js";
import { assignmentKey, allowedPatternIdsFor } from "./data.js";

function timeToMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

function generateMonthlySchedule(state, year, month) {
  const { staff, patterns, assignments, requestedOff, facility } = state;
  const patternMap = Object.fromEntries(patterns.map((p) => [p.id, p]));
  const nd = daysInMonth(year, month);
  const threshold = monthlyHolidayThreshold(nd);
  const maxWorkDays = Math.max(0, nd - threshold);
  const dayPatterns = patterns.filter((p) => !p.isNight);
  const nightPatterns = patterns.filter((p) => p.isNight);
  const orderedPatterns = [...nightPatterns, ...[...dayPatterns].sort((a, b) =>
    (b.requiredQualifiedCount - a.requiredQualifiedCount) || (b.requiredCount - a.requiredCount))];
  const kihatsukanStaff = staff.filter((s) => s.role === "児童発達支援管理責任者");

  const track = {};
  const allowedFor = {};
  staff.forEach((s) => {
    track[s.id] = { workDays: 0, nightCount: 0, consecutiveWork: 0, nightYesterday: false, lastShiftEndAbs: null, weekMinutes: {} };
    allowedFor[s.id] = new Set(allowedPatternIdsFor(s, patterns));
  });

  let filledCount = 0;
  let skippedFixed = 0;

  function applyToTracker(s, value, dateOrdinal, weekIndex) {
    const t = track[s.id];
    const p = patternMap[value];
    if (p) {
      t.workDays++;
      t.consecutiveWork++;
      if (p.isNight) t.nightCount++;
      t.weekMinutes[weekIndex] = (t.weekMinutes[weekIndex] || 0) + patternDurationMin(p);
      let endAbs = (dateOrdinal - 1) * 24 * 60 + timeToMin(p.end);
      if (timeToMin(p.end) <= timeToMin(p.start)) endAbs += 24 * 60;
      t.lastShiftEndAbs = endAbs;
    } else {
      t.consecutiveWork = 0;
    }
  }

  for (let d = 1; d <= nd; d++) {
    const dateISO = toISO(year, month, d);
    const weekIndex = Math.floor((d - 1) / 7);
    const decidedToday = {}; // staffId -> "OFF" | "PAID" | patternId
    const trackedToday = new Set();

    const decide = (s, value) => { decidedToday[s.id] = value; };
    const trackOnce = (s, value) => {
      if (trackedToday.has(s.id)) return;
      trackedToday.add(s.id);
      applyToTracker(s, value, d, weekIndex);
    };

    // 1. 既存の割当・希望休を「確定枠」として先に反映（自動生成は上書きしない）
    for (const s of staff) {
      const key = assignmentKey(s.id, dateISO);
      if (assignments[key]) {
        decide(s, assignments[key]);
        trackOnce(s, assignments[key]);
        skippedFixed++;
      } else if (requestedOff[key]) {
        decide(s, "OFF");
        trackOnce(s, "OFF");
      }
    }

    const isFree = (s) => !decidedToday[s.id];

    const eligible = (s, pattern) => {
      if (!isFree(s)) return false;
      if (!allowedFor[s.id].has(pattern.id)) return false;
      const t = track[s.id];
      if (t.nightYesterday) return false; // 夜勤明けは休み
      if (t.workDays >= maxWorkDays) return false;
      if (t.consecutiveWork >= 6) return false;
      if (pattern.isNight && s.nightExempt) return false;
      const dur = patternDurationMin(pattern);
      if (s.reducedHours && dur > (s.reducedHoursLimitMin || 0)) return false;
      const startAbs = (d - 1) * 24 * 60 + timeToMin(pattern.start);
      if (t.lastShiftEndAbs !== null && (startAbs - t.lastShiftEndAbs) < 11 * 60) return false;
      if (!facility.deformedLaborSystem) {
        const wk = t.weekMinutes[weekIndex] || 0;
        if (wk + dur > 40 * 60) return false;
      }
      return true;
    };

    const fairness = (a, b, pattern) => {
      const ta = track[a.id], tb = track[b.id];
      if (ta.workDays !== tb.workDays) return ta.workDays - tb.workDays;
      if (pattern.isNight && ta.nightCount !== tb.nightCount) return ta.nightCount - tb.nightCount;
      return 0;
    };

    const commit = (s, pattern) => {
      decide(s, pattern.id);
      trackOnce(s, pattern.id);
      filledCount++;
    };

    // Step A: 児発管は最低1名/日を優先確保
    for (const k of kihatsukanStaff) {
      if (!isFree(k)) continue;
      const candidates = dayPatterns.filter((p) => eligible(k, p));
      if (candidates.length > 0) commit(k, candidates[0]);
    }

    // Step B: 各パターンの必要人数を埋める（既存確定分を人数に加味）
    for (const pattern of orderedPatterns) {
      const alreadyCount = staff.filter((s) => decidedToday[s.id] === pattern.id).length;
      let need = pattern.requiredCount - alreadyCount;
      if (need <= 0) continue;
      let qualifiedAlready = staff.filter((s) => decidedToday[s.id] === pattern.id && s.qualified).length;
      let qualifiedNeeded = Math.max(0, pattern.requiredQualifiedCount - qualifiedAlready);

      const pool = staff.filter((s) => eligible(s, pattern)).sort((a, b) => {
        if (qualifiedNeeded > 0) {
          const aQ = a.qualified ? 0 : 1, bQ = b.qualified ? 0 : 1;
          if (aQ !== bQ) return aQ - bQ;
        }
        return fairness(a, b, pattern);
      });

      for (const s of pool) {
        if (need <= 0) break;
        commit(s, pattern);
        need--;
        if (s.qualified) qualifiedNeeded--;
      }
    }

    // Step C: それでも未定の職員はその日は休みとする
    for (const s of staff) {
      if (isFree(s)) {
        decide(s, "OFF");
        trackOnce(s, "OFF");
        filledCount++;
      }
    }

    // 翌日の「夜勤明け」判定用フラグを更新し、結果を書き戻す
    for (const s of staff) {
      track[s.id].nightYesterday = nightPatterns.some((p) => p.id === decidedToday[s.id]);
      assignments[assignmentKey(s.id, dateISO)] = decidedToday[s.id];
    }
  }

  return { filledCount, skippedFixed };
}

export { generateMonthlySchedule };
