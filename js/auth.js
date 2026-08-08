// 簡易的な「管理者モード / 職員モード」切替。サーバーがないため本格的なセキュリティではなく、
// 現場の共用端末での誤操作・誤入力を防ぐための、見た目上の制限です。
const MODE_KEY = "shift-planner-pilot/mode";

function getMode() {
  return localStorage.getItem(MODE_KEY) || "staff";
}

function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}

function isAdminMode() {
  return getMode() === "admin";
}

function tryEnterAdminMode(state, save) {
  const currentPin = state.facility.adminPin;
  if (!currentPin) {
    const newPin = prompt("はじめての管理者モード切替です。管理者用のPIN（4文字以上）を設定してください。");
    if (newPin === null) return false;
    if (newPin.trim().length < 4) { alert("PINは4文字以上で設定してください。"); return false; }
    state.facility.adminPin = newPin.trim();
    save();
    setMode("admin");
    return true;
  }
  const input = prompt("管理者PINを入力してください。");
  if (input === null) return false;
  if (input === currentPin) {
    setMode("admin");
    return true;
  }
  alert("PINが違います。");
  return false;
}

function exitAdminMode() {
  setMode("staff");
}

function changeAdminPin(state, save) {
  const currentPin = state.facility.adminPin;
  const input = prompt("現在の管理者PINを入力してください。");
  if (input === null) return;
  if (input !== currentPin) { alert("PINが違います。"); return; }
  const next = prompt("新しいPINを入力してください（4文字以上）。");
  if (next === null) return;
  if (next.trim().length < 4) { alert("PINは4文字以上で設定してください。"); return; }
  state.facility.adminPin = next.trim();
  save();
  alert("PINを変更しました。");
}

export { getMode, setMode, isAdminMode, tryEnterAdminMode, exitAdminMode, changeAdminPin };
