(() => {
  'use strict';

  const screen = document.querySelector('.screen');
  const frame = document.getElementById('page-frame');
  if (!screen || !frame) return;

  const keyboard = document.createElement('section');
  keyboard.className = 'ios-keyboard';
  keyboard.setAttribute('aria-hidden', 'true');
  keyboard.innerHTML = `
    <div class="ios-keyboard-suggestions">
      <button type="button" data-insert="想去">想去</button>
      <button type="button" data-insert="推荐">推荐</button>
      <button type="button" data-insert="旅行">旅行</button>
    </div>
    <div class="ios-keyboard-rows">
      <div class="ios-keyboard-row">
        ${'qwertyuiop'.split('').map((key) => `<button class="ios-key" type="button" data-character="${key}">${key}</button>`).join('')}
      </div>
      <div class="ios-keyboard-row ios-keyboard-row--middle">
        ${'asdfghjkl'.split('').map((key) => `<button class="ios-key" type="button" data-character="${key}">${key}</button>`).join('')}
      </div>
      <div class="ios-keyboard-row ios-keyboard-row--third">
        <button class="ios-key" type="button" data-key="shift" aria-label="大写">⇧</button>
        ${'zxcvbnm'.split('').map((key) => `<button class="ios-key" type="button" data-character="${key}">${key}</button>`).join('')}
        <button class="ios-key" type="button" data-key="backspace" aria-label="删除">⌫</button>
      </div>
      <div class="ios-keyboard-row ios-keyboard-row--bottom">
        <button class="ios-key" type="button" data-key="symbols">123</button>
        <button class="ios-key" type="button" data-key="globe" aria-label="切换键盘">◎</button>
        <button class="ios-key" type="button" data-key="space">空格</button>
        <button class="ios-key" type="button" data-key="done">完成</button>
      </div>
    </div>
    <span class="ios-keyboard-home" aria-hidden="true"></span>
  `;
  screen.appendChild(keyboard);

  let activeInput = null;
  let uppercase = false;

  const textInputTypes = new Set(['', 'text', 'search', 'email', 'url', 'tel', 'number', 'password']);

  function isEditable(element) {
    if (!element || element.disabled || element.readOnly) return false;
    if (element.isContentEditable) return true;
    if (element.tagName === 'TEXTAREA') return true;
    return element.tagName === 'INPUT' && textInputTypes.has((element.type || '').toLowerCase());
  }

  function setKeyboardVisible(visible) {
    screen.classList.toggle('keyboard-visible', visible);
    keyboard.setAttribute('aria-hidden', String(!visible));
  }

  function showKeyboard(element) {
    activeInput = element;
    setKeyboardVisible(true);
    window.setTimeout(() => {
      if (activeInput?.isConnected) {
        activeInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 260);
  }

  function hideKeyboard() {
    setKeyboardVisible(false);
    activeInput = null;
  }

  function dispatchInput(element, value, inputType, data = null) {
    if (element.isContentEditable) {
      element.ownerDocument.execCommand('insertText', false, data || '');
      return;
    }

    const prototype = element.tagName === 'TEXTAREA'
      ? element.ownerDocument.defaultView.HTMLTextAreaElement.prototype
      : element.ownerDocument.defaultView.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new element.ownerDocument.defaultView.InputEvent('input', {
      bubbles: true,
      inputType,
      data,
    }));
  }

  function insertText(text) {
    if (!isEditable(activeInput)) return;
    if (activeInput.isContentEditable) {
      activeInput.ownerDocument.execCommand('insertText', false, text);
      return;
    }
    const value = activeInput.value || '';
    const start = activeInput.selectionStart ?? value.length;
    const end = activeInput.selectionEnd ?? value.length;
    const nextValue = value.slice(0, start) + text + value.slice(end);
    dispatchInput(activeInput, nextValue, 'insertText', text);
    const cursor = start + text.length;
    activeInput.setSelectionRange?.(cursor, cursor);
  }

  function backspace() {
    if (!isEditable(activeInput) || activeInput.isContentEditable) {
      activeInput?.ownerDocument.execCommand('delete', false);
      return;
    }
    const value = activeInput.value || '';
    const start = activeInput.selectionStart ?? value.length;
    const end = activeInput.selectionEnd ?? value.length;
    if (start === 0 && end === 0) return;
    const deleteStart = start === end ? Math.max(0, start - 1) : start;
    const nextValue = value.slice(0, deleteStart) + value.slice(end);
    dispatchInput(activeInput, nextValue, 'deleteContentBackward');
    activeInput.setSelectionRange?.(deleteStart, deleteStart);
  }

  function pressEnter() {
    if (!activeInput) return;
    if (activeInput.tagName === 'TEXTAREA' || activeInput.isContentEditable) {
      insertText('\n');
      return;
    }
    const view = activeInput.ownerDocument.defaultView;
    activeInput.dispatchEvent(new view.KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    activeInput.dispatchEvent(new view.KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
  }

  function updateLetterCase() {
    keyboard.querySelectorAll('[data-character]').forEach((button) => {
      button.textContent = uppercase ? button.dataset.character.toUpperCase() : button.dataset.character;
    });
    keyboard.querySelector('[data-key="shift"]')?.classList.toggle('is-active', uppercase);
  }

  keyboard.addEventListener('pointerdown', (event) => event.preventDefault());
  keyboard.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !activeInput) return;

    if (button.dataset.insert) insertText(button.dataset.insert);
    if (button.dataset.character) {
      insertText(uppercase ? button.dataset.character.toUpperCase() : button.dataset.character);
      if (uppercase) {
        uppercase = false;
        updateLetterCase();
      }
    }

    const key = button.dataset.key;
    if (key === 'shift') {
      uppercase = !uppercase;
      updateLetterCase();
    }
    if (key === 'backspace') backspace();
    if (key === 'space') insertText(' ');
    if (key === 'done') {
      pressEnter();
      activeInput.blur();
      hideKeyboard();
    }
  });

  function bindFrameInteractions() {
    let frameDocument;
    try {
      frameDocument = frame.contentDocument;
    } catch {
      return;
    }
    if (!frameDocument || frameDocument.documentElement.dataset.previewKeyboardBound) return;
    frameDocument.documentElement.dataset.previewKeyboardBound = 'true';

    frameDocument.addEventListener('focusin', (event) => {
      if (isEditable(event.target)) showKeyboard(event.target);
    }, true);
    frameDocument.addEventListener('pointerdown', (event) => {
      if (!isEditable(event.target)) hideKeyboard();
    }, true);
    frameDocument.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!isEditable(frameDocument.activeElement)) hideKeyboard();
      }, 0);
    }, true);
  }

  frame.addEventListener('load', bindFrameInteractions);
  bindFrameInteractions();
})();
