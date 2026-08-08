// データモデルと永続化（ブラウザ localStorage のみ。サーバー・認証なしのパイロット版）
const STORAGE_KEY = "shift-planner-pilot/v1";

const SURNAMES = ["佐藤","鈴木","高橋","田中","伊藤","渡辺","山本","中村","小林","加藤","吉田","山田","佐々木","山口","松本","井上","木村","林","斎藤","清水"];
const GIVEN = ["陽菜","翔太","美咲","健太","結衣","大輔","彩","蓮","さくら","悠人","真央","拓也","愛","颯太","智子","直樹","舞","隼人","千尋","啓介"];

function genName(i) {
  const s = SURNAMES[i % SURNAMES.length];
  const g = GIVEN[(i * 7 + 3) % GIVEN.length];
  return `${s} ${g}`;
}

function defaultPatterns() {
  return [
    { id: "p_early", name: "早番", start: "07:00", end: "16:00", breakMin: 60, requiredCount: 3, requiredQualifiedCount: 1, isNight: false },
    { id: "p_day",   name: "日勤", start: "09:00", end: "18:00", breakMin: 60, requiredCount: 4, requiredQualifiedCount: 1, isNight: false },
    { id: "p_late",  name: "遅番", start: "11:00", end: "20:00", breakMin: 60, requiredCount: 3, requiredQualifiedCount: 1, isNight: false },
    { id: "p_night", name: "夜勤", start: "17:00", end: "09:00", breakMin: 60, requiredCount: 2, requiredQualifiedCount: 1, isNight: true },
  ];
}

function defaultStaff() {
  const staff = [];
  let idx = 0;
  for (let u = 1; u <= 4; u++) {
    for (let k = 0; k < 4; k++) {
      staff.push({
        id: `s_${idx}`,
        name: genName(idx),
        role: "児童指導員・保育士",
        unit: u,
        employment: idx % 5 === 0 ? "非常勤" : "常勤",
        qualified: idx % 6 !== 0,
        reducedHours: idx === 3,
        reducedHoursLimitMin: 360,
        nightExempt: idx === 3,
        annualPaidLeaveGranted: 12,
      });
      idx++;
    }
  }
  staff.push({ id: "s_kihatsukan", name: genName(idx++), role: "児童発達支援管理責任者", unit: null, employment: "常勤", qualified: true, reducedHours: false, nightExempt: false, annualPaidLeaveGranted: 12 });
  staff.push({ id: "s_nurse1", name: genName(idx++), role: "看護師", unit: 1, employment: "常勤", qualified: true, reducedHours: false, nightExempt: false, annualPaidLeaveGranted: 12 });
  staff.push({ id: "s_nurse2", name: genName(idx++), role: "看護師", unit: 3, employment: "非常勤", qualified: true, reducedHours: false, nightExempt: false, annualPaidLeaveGranted: 10 });
  staff.push({ id: "s_manager", name: genName(idx++), role: "管理者", unit: null, employment: "常勤", qualified: true, reducedHours: false, nightExempt: false, annualPaidLeaveGranted: 15 });
  return staff;
}

function defaultState() {
  return {
    facility: {
      name: "パイロット施設",
      capacity: 20,
      units: 4,
      overtimeMonthlyCapMin: 45 * 60,
      overtimeAnnualCapMin: 360 * 60,
      deformedLaborSystem: false,
    },
    staff: defaultStaff(),
    patterns: defaultPatterns(),
    // assignments[`${staffId}|${dateISO}`] = patternId | "OFF" | "PAID"
    assignments: {},
    // requestedOff[`${staffId}|${dateISO}`] = true
    requestedOff: {},
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed.staff || !parsed.patterns) return defaultState();
    return parsed;
  } catch (e) {
    console.warn("failed to load state, resetting", e);
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

function assignmentKey(staffId, dateISO) {
  return `${staffId}|${dateISO}`;
}

export { loadState, saveState, resetState, defaultState, assignmentKey };
