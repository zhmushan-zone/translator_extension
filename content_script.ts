type SupportLang = "zh" | "en";

/**
 * 弹窗放在 Shadow DOM 里, 不受页面 CSS 影响 (#31);
 * 挂在 <html> 而不是 <body> 下, 站内跳转替换整个 body 时不会被带走 (#22).
 */
const host = document.createElement("translator-extension");
host.id = "translatorExtensionContainer";
host.setAttribute("style", "all: initial !important; display: contents !important;");
const shadow = host.attachShadow({ mode: "open" });
shadow.innerHTML = `
<style>
  .translatorExtension {
    box-sizing: border-box;
    font-family: Segoe UI, "Segoe UI Web (West European)", -apple-system,
      BlinkMacSystemFont, Roboto, Helvetica Neue, sans-serif;
    padding: 4px;
    z-index: 2147483647;
    line-height: 1.5;
    border: 1px solid #000;
    background: #fff;
    color: #000;
    font-size: 15px;
    text-align: left;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }
  .translator {
    display: none;
    position: absolute;
    max-width: 30vw;
  }
  .translatorTip {
    position: fixed;
    display: flex;
    justify-content: center;
    bottom: -40vh;
    left: 0;
    right: 0;
    margin: 0 auto;
    width: 100%;
    transition: all 80ms;
    visibility: hidden;
  }
  .translatorExtensionTheNewUI {
    border-color: rgba(0, 0, 0, 0.12);
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(18px);
    color: #201f1e;
  }
  .translatorExtensionTheNewUI.dark {
    border-color: rgba(255, 255, 255, 0.16);
    background: rgba(32, 31, 30, 0.72);
    color: #f3f2f1;
  }
  @media print {
    .translatorExtension {
      display: none !important;
    }
  }
</style>
<div class="translatorExtension translator"></div>
<div class="translatorExtension translatorTip"></div>
`;
const translator = shadow.querySelector(".translator") as HTMLElement;
const translatorTip = shadow.querySelector(".translatorTip") as HTMLElement;

function mount() {
  if (!host.isConnected) document.documentElement.appendChild(host);
}
mount();

chrome.runtime.sendMessage({ type: "ui" }, (resp) => {
  if (resp) {
    translator.classList.add("translatorExtensionTheNewUI");
    translatorTip.classList.add("translatorExtensionTheNewUI");
  }
});

chrome.storage.onChanged.addListener(({ UISwitch }) => {
  if (UISwitch) {
    if (UISwitch.newValue) {
      translator.classList.add("translatorExtensionTheNewUI");
      translatorTip.classList.add("translatorExtensionTheNewUI");
    } else {
      translator.classList.remove("translatorExtensionTheNewUI");
      translatorTip.classList.remove("translatorExtensionTheNewUI");
    }
  }
});

/**
 * 只展示最近一次划词的结果, 避免先发后到的响应覆盖新结果.
 */
let latestRequest = 0;

document.addEventListener("mouseup", (evt) => {
  if ((evt.target as HTMLElement).id !== "translatorExtensionContainer") {
    chrome.runtime.sendMessage(
      {
        type: "check",
      },
      (resp) => {
        if (resp) {
          const text = document.getSelection()?.toString();
          if (text?.trim()) {
            const [originLanguage, targetLanguage] = getLangOriginAndTarget(
              text,
            );
            const request = ++latestRequest;
            const show = (content: string) => {
              mount();
              // 全新 UI 跟随页面明暗: 选区文字是浅色时用深色毛玻璃
              const dark = isLight(selectionColor());
              translator.classList.toggle("dark", dark);
              translatorTip.classList.toggle("dark", dark);
              translator.textContent = content;
              // 先放在最左边量出自然宽度, 靠近右边缘时整体左移, 避免被挤窄或显示不全
              setStyle(translator, { display: "block", top: `${evt.pageY}px`, left: "0" });
              const maxLeft = window.scrollX +
                document.documentElement.clientWidth - translator.offsetWidth - 8;
              setStyle(translator, {
                left: `${Math.max(Math.min(evt.pageX, maxLeft), window.scrollX)}px`,
              });
            };
            // 大模型翻译要等好几秒, 迟迟没有结果时先给个提示
            const pending = setTimeout(() => {
              if (request === latestRequest) show("翻译中…");
            }, 500);
            chrome.runtime.sendMessage({
              type: "translate",
              text: text.trim(),
              from: originLanguage,
              to: targetLanguage,
            }, (resp) => {
              clearTimeout(pending);
              if (request === latestRequest) show(resp);
            });
          }
        }
      },
    );
  }
});

document.addEventListener("mousedown", (evt) => {
  if ((evt.target as HTMLElement).id !== "translatorExtensionContainer") {
    latestRequest++;
    translator.innerHTML = "";
    setStyle(translator, {
      display: "none",
    });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "tip") {
    showTip(message.on ? "划词翻译已开启" : "划词翻译已关闭");
  }
});

function showTip(text: string) {
  mount();
  translatorTip.innerText = text;
  setStyle(translatorTip, {
    bottom: "8px",
    visibility: "visible",
  });
  const st = setTimeout(() => {
    setStyle(translatorTip, {
      bottom: "-40vh",
      visibility: "hidden",
    });
    clearTimeout(st);
  }, 2000);
}

function selectionColor() {
  const node = document.getSelection()?.anchorNode;
  const element = node instanceof Element ? node : node?.parentElement;
  return element ? getComputedStyle(element).color : "";
}

function isLight(color: string) {
  const [r, g, b] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  if (r === undefined) return false;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

function isChinese(text: string): boolean {
  return /[\u4E00-\u9FA5\uF900-\uFA2D]/.test(text);
}

function setStyle(e: HTMLElement, s: Partial<CSSStyleDeclaration>): void {
  for (const k in s) {
    const v = s[k];
    if (typeof v === "string") {
      e.style[k] = v;
    }
  }
}

function getLangOriginAndTarget(text: string): [SupportLang, SupportLang] {
  const o: SupportLang = isChinese(text) ? "zh" : "en";
  const t: SupportLang = o === "en" ? "zh" : "en";
  return [o, t];
}
