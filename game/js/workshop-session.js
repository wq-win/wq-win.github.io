(function (root) {
'use strict';
// One accessible sheet for rules and destructive actions; no game state lives here.
root.WorkshopSession = function (options) {
  const dialog = document.createElement('dialog');
  dialog.className = 'workshop-sheet';
  dialog.setAttribute('aria-labelledby', 'workshop-sheet-title');
  const title = document.createElement('h2'); title.id = 'workshop-sheet-title';
  const copy = document.createElement('p');
  const actions = document.createElement('div'); actions.className = 'workshop-sheet-actions';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '继续本局';
  const confirm = document.createElement('button'); confirm.type = 'button';
  actions.append(cancel, confirm); dialog.append(title, copy, actions);
  (options.host || document.querySelector('main') || document.body).append(dialog);
  let pending = null, previous = null;
  function close(run) {
    const action = pending; pending = null;
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    if (previous && previous.isConnected) previous.focus({preventScroll:true});
    if (run && action) action();
  }
  cancel.addEventListener('click', () => close(false));
  confirm.addEventListener('click', () => close(true));
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(false); });
  function open(heading, text, label, action) {
    if (dialog.open) return;
    previous = document.activeElement; pending = action || null;
    title.textContent = heading; copy.textContent = text; confirm.textContent = label;
    cancel.hidden = !action;
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    (action ? cancel : confirm).focus();
  }
  const help = document.createElement('button'); help.type = 'button'; help.className = 'workshop-help';
  help.textContent = '玩法'; help.setAttribute('aria-label', '查看玩法说明');
  (options.nav || document.querySelector('nav')).append(help);
  help.addEventListener('click', () => open('三步上手', options.rules, '知道了'));
  return { confirm(action) { open('要离开当前进度吗？', '重新开始或切换关卡会清除本局操作，已完成的关卡记录会保留。', '放弃本局并继续', action); } };
};
})(window);
