type SupportLang = "zh-CN" | "en";

const translator = document.createElement("div");
translator.setAttribute("id", "translatorExtensionContainer");
translator.setAttribute("class", "translatorExtension");
const translatorTip = document.createElement("div");
translatorTip.setAttribute("class", "translatorExtension");
const globalStyle = document.createElement("style");
globalStyle.innerHTML = `
.translatorExtension {
  font-family: Segoe UI, "Segoe UI Web (West European)", -apple-system,
    BlinkMacSystemFont, Roboto, Helvetica Neue, sans-serif;
  display: none;
  padding: 4px;
  position:absolute;
  z-index:999999999;
  background: transparent;
  border:1px solid;
  backdrop-filter: blur(18px);
  max-width: 30vw;
  line-height: 1.5em;
}
`;
document.head.appendChild(globalStyle);
setStyle(translatorTip, {
  position: "fixed",
  display: "flex",
  justifyContent: "center",
  bottom: "-40vh",
  left: "0",
  right: "0",
  margin: "0 auto",
  width: "100%",
  transition: "all 80ms"
});
document.body.appendChild(translator);
document.body.appendChild(translatorTip);

document.addEventListener("mouseup", evt => {
  if ((evt.target as HTMLElement).id !== "translatorExtensionContainer") {
    chrome.runtime.sendMessage(
      {
        type: "check"
      },
      resp => {
        if (resp) {
          const text = document.getSelection()?.toString();
          if (text?.trim()) {
            const [originLanguage, targetLanguage] = getLangOriginAndTarget(
              text
            );
            chrome.runtime.sendMessage(
              {
                type: "fetch",
                url:
                  `https://translate.google.cn/m?hl=en&sl=${originLanguage}&tl=${targetLanguage}&q=${text}`
              },
              resp => {
                const elt = document.createElement("div");
                elt.innerHTML = resp;
                const result = (elt.querySelector(".t0") as HTMLElement)
                  .innerText;
                setStyle(translator, {
                  display: "block",
                  top: `${evt.pageY}px`,
                  left: `${evt.pageX}px`
                });
                translator.innerText = result;
              }
            );
          }
        }
      }
    );
  }
});

document.addEventListener("mousedown", evt => {
  if ((evt.target as HTMLElement).id !== "translatorExtension") {
    translator.innerHTML = "";
    setStyle(translator, {
      display: "none"
    });
  }
});

document.addEventListener("keyup", evt => {
  if (
    (evt.ctrlKey && evt.keyCode === 18) ||
    (evt.altKey && evt.keyCode === 17)
  ) {
    chrome.runtime.sendMessage(
      {
        type: "toggleCurrent"
      },
      resp => {
        const text = resp ? "划词翻译已开启" : "划词翻译已关闭";
        translatorTip.innerText = text;
        translatorTip.style.bottom = "8px";
        const st = setTimeout(() => {
          translatorTip.style.bottom = "-40vh";
          clearTimeout(st);
        }, 2000);
      }
    );
  }
});

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
  const o: SupportLang = isChinese(text) ? "zh-CN" : "en";
  const t: SupportLang = o === "en" ? "zh-CN" : "en";
  return [o, t];
}