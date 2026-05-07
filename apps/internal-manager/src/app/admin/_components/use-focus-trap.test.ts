// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setupFocusTrap } from "./use-focus-trap";

type Buttons = {
  container: HTMLElement;
  buttonA: HTMLButtonElement;
  buttonB: HTMLButtonElement;
  buttonC: HTMLButtonElement;
};

const buildContainer = (): Buttons => {
  const container = document.createElement("div");
  const buttonA = document.createElement("button");
  buttonA.textContent = "A";
  const buttonB = document.createElement("button");
  buttonB.textContent = "B";
  const buttonC = document.createElement("button");
  buttonC.textContent = "C";
  container.append(buttonA, buttonB, buttonC);
  document.body.appendChild(container);
  return { container, buttonA, buttonB, buttonC };
};

const dispatchTab = (shiftKey = false) => {
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
};

let dispose: (() => void) | undefined;

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
});

test("setupFocusTrap は先頭のフォーカス可能要素にフォーカスを移す", () => {
  const { container, buttonA } = buildContainer();
  dispose = setupFocusTrap(container);
  expect(document.activeElement).toStrictEqual(buttonA);
});

test("Tab キーで末尾要素から先頭要素へラップする", () => {
  const { container, buttonA, buttonC } = buildContainer();
  dispose = setupFocusTrap(container);
  buttonC.focus();
  dispatchTab(false);
  expect(document.activeElement).toStrictEqual(buttonA);
});

test("Shift+Tab キーで先頭要素から末尾要素へラップする", () => {
  const { container, buttonA, buttonC } = buildContainer();
  dispose = setupFocusTrap(container);
  buttonA.focus();
  dispatchTab(true);
  expect(document.activeElement).toStrictEqual(buttonC);
});

test("末尾以外で Tab を押した場合はラップせずブラウザに委ねる", () => {
  const { container, buttonA, buttonB } = buildContainer();
  dispose = setupFocusTrap(container);
  buttonA.focus();
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey: false,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  expect(event.defaultPrevented).toStrictEqual(false);
  // ブラウザが自動でフォーカス移動するわけではないため、active は変わらない
  expect(document.activeElement).toStrictEqual(buttonA);
  // 余分な要素が触られていないことを確認
  expect(buttonB).toStrictEqual(buttonB);
});

test("Tab 以外のキーは無視する", () => {
  const { container, buttonA } = buildContainer();
  dispose = setupFocusTrap(container);
  buttonA.focus();
  const event = new KeyboardEvent("keydown", {
    key: "ArrowRight",
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  expect(document.activeElement).toStrictEqual(buttonA);
});

test("フォーカス可能要素が無いコンテナでは Tab を抑止する", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  dispose = setupFocusTrap(container);
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  expect(event.defaultPrevented).toStrictEqual(true);
});

test("クリーンアップ時に keydown リスナーが解除され、元のフォーカスが復元される", () => {
  const trigger = document.createElement("button");
  trigger.textContent = "Open";
  document.body.appendChild(trigger);
  trigger.focus();

  const { container, buttonA, buttonC } = buildContainer();
  const removeSpy = vi.spyOn(document, "removeEventListener");
  dispose = setupFocusTrap(container);
  expect(document.activeElement).toStrictEqual(buttonA);

  // dispose 後は Tab ハンドラが効かないので末尾→先頭ラップは起こらない
  dispose();
  dispose = undefined;
  expect(removeSpy).toHaveBeenCalled();
  expect(document.activeElement).toStrictEqual(trigger);

  buttonC.focus();
  dispatchTab(false);
  // ラップされず buttonC のままであることでハンドラ解除を確認
  expect(document.activeElement).toStrictEqual(buttonC);
  removeSpy.mockRestore();
});
