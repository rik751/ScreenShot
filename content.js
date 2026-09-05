// Scope isolation variables to prevent memory leakage crashes across repeat script executions
if (typeof currentTrackCursor === "undefined") {
  var currentTrackCursor = null;
  var hoveredElement = null;
  var lastOutlineStyle = "";
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start-selection") {
    const oldOverlay = document.getElementById("fx-screenshot-overlay");
    if (oldOverlay) oldOverlay.remove();
    const oldEyes = document.getElementById("fx-eye-overlay");
    if (oldEyes) oldEyes.remove();

    initEscKey();
    playFirefoxAnimation();
  }
});

function initEscKey() {
  window.removeEventListener("keydown", handleEscPress);
  window.addEventListener("keydown", handleEscPress);
}

function handleEscPress(e) {
  if (e.key === "Escape") {
    closeAllScreenshotUI();
  }
}

function closeAllScreenshotUI() {
  if (currentTrackCursor) {
    window.removeEventListener("mousemove", currentTrackCursor);
    currentTrackCursor = null;
  }
  window.removeEventListener("keydown", handleEscPress);
  window.removeEventListener("mousemove", handleElementHover);
  window.removeEventListener("click", handleElementClick, true);

  if (hoveredElement) {
    hoveredElement.style.outline = lastOutlineStyle;
    hoveredElement = null;
  }

  const eyeContainer = document.getElementById("fx-eye-overlay");
  if (eyeContainer) {
    const eyePanel = eyeContainer.querySelector("div");
    if (eyePanel) {
      eyePanel.style.transform = "scale(0)";
      eyePanel.style.opacity = "0";
    }
    setTimeout(() => eyeContainer.remove(), 200);
  }

  const screenshotOverlay = document.getElementById("fx-screenshot-overlay");
  if (screenshotOverlay) screenshotOverlay.remove();
}

function playFirefoxAnimation() {
  if (document.getElementById("fx-eye-overlay")) return;

  const container = document.createElement("div");
  container.id = "fx-eye-overlay";
  container.style = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:9999999;display:flex;justify-content:center;align-items:center;";

  const eyePanel = document.createElement("div");
  eyePanel.style = "background:#1c1b22;padding:40px 6px;border-radius:12px;display:flex;gap:20px;box-shadow:0 12px 30px rgba(0,0,0,0.5);border:1px solid #42414d;transform:scale(0);opacity:0;transition:transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;";

  eyePanel.innerHTML = `
    <div class="fx-eye" style="width:80px;height:80px;background:white;border-radius:50%;position:relative;display:flex;justify-content:center;align-items:center;overflow:hidden;">
      <div class="fx-pupil" style="width:28px;height:28px;background:#1c1b22;border-radius:50%;position:absolute;transition:transform 0.05s ease-out;"></div>
    </div>
    <div class="fx-eye" style="width:80px;height:80px;background:white;border-radius:50%;position:relative;display:flex;justify-content:center;align-items:center;overflow:hidden;">
      <div class="fx-pupil" style="width:28px;height:28px;background:#1c1b22;border-radius:50%;position:absolute;transition:transform 0.05s ease-out;"></div>
    </div>
  `;

  container.appendChild(eyePanel);
  document.body.appendChild(container);

  requestAnimationFrame(() => {
    eyePanel.style.transform = "scale(1)";
    eyePanel.style.opacity = "1";
  });

  const pupils = container.querySelectorAll(".fx-pupil");

  // Pupils roll toward wherever the cursor currently is, relative to each eye's
  // own center -- this is the "eyes follow the cursor" effect.
  currentTrackCursor = function (e) {
    pupils.forEach((pupil) => {
      const eye = pupil.parentElement;
      if (!eye) return;
      const rect = eye.getBoundingClientRect();
      const eyeX = rect.left + rect.width / 2;
      const eyeY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
      const maxDistance = 20;
      const pupilX = Math.cos(angle) * maxDistance;
      const pupilY = Math.sin(angle) * maxDistance;
      pupil.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
    });
  };

  window.addEventListener("mousemove", currentTrackCursor);

  setTimeout(() => {
    if (!document.getElementById("fx-eye-overlay")) return;
    window.removeEventListener("mousemove", currentTrackCursor);
    currentTrackCursor = null;

    eyePanel.style.transform = "scale(0)";
    eyePanel.style.opacity = "0";

    setTimeout(() => {
      container.remove();
      createScreenshotOverlay();
    }, 200);
  }, 1000);
}

function createScreenshotOverlay() {
  if (document.getElementById("fx-screenshot-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "fx-screenshot-overlay";
  overlay.style = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.45);cursor:crosshair;z-index:9999998;user-select:none;";

  const instructions = document.createElement("div");
  instructions.id = "fx-instructions-panel";
  instructions.style = "position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);text-align:center;color:white;font-family:sans-serif;pointer-events:auto;z-index:9999999;";

  instructions.innerHTML = `
    <div style="position:relative;width:60px;height:50px;margin:0 auto 15px auto;">
      <div style="position:absolute;top:0;left:0;width:10px;height:10px;border-top:2px solid white;border-left:2px solid white;"></div>
      <div style="position:absolute;top:0;right:0;width:10px;height:10px;border-top:2px solid white;border-right:2px solid white;"></div>
      <div style="position:absolute;bottom:0;left:0;width:10px;height:10px;border-bottom:2px solid white;border-left:2px solid white;"></div>
      <div style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-bottom:2px solid white;border-right:2px solid white;"></div>
      <div style="font-size:24px;line-height:46px;letter-spacing:2px;font-weight:bold;margin-left:4px;">° ͜  °</div>
    </div>
    <div style="font-size:18px;font-weight:500;margin-bottom:20px;max-width:340px;line-height:1.4;">Drag or click on the page to select a region. Press ESC to cancel.</div>
    <button id="fx-main-cancel-btn" style="background:transparent;color:white;border:1.5px solid white;padding:8px 24px;border-radius:20px;font-size:14px;font-weight:bold;cursor:pointer;transition:background 0.2s;">Cancel</button>
  `;

  overlay.appendChild(instructions);
  document.body.appendChild(overlay);
  createQuickActionsPanel(overlay);

  const mainCancelBtn = instructions.querySelector("#fx-main-cancel-btn");
  mainCancelBtn.onmouseenter = () => (mainCancelBtn.style.background = "rgba(255,255,255,0.15)");
  mainCancelBtn.onmouseleave = () => (mainCancelBtn.style.background = "transparent");
  mainCancelBtn.onclick = (e) => {
    e.stopPropagation();
    closeAllScreenshotUI();
  };

  window.addEventListener("mousemove", handleElementHover);
  window.addEventListener("click", handleElementClick, true);

  let startX, startY, selectionBox, buttonPanel;

  overlay.addEventListener("mousedown", (e) => {
    if (
      e.target.tagName === "BUTTON" ||
      e.target.closest("#fx-btn-panel") ||
      e.target.closest("#fx-instructions-panel") ||
      e.target.closest("#fx-quickactions-panel")
    ) return;

    if (selectionBox) selectionBox.remove();
    if (buttonPanel) buttonPanel.remove();
    instructions.style.display = "none";
    hideQuickActionsPanel();

    window.removeEventListener("mousemove", handleElementHover);
    if (hoveredElement) {
      hoveredElement.style.outline = lastOutlineStyle;
      hoveredElement = null;
    }

    startX = e.clientX;
    startY = e.clientY;

    selectionBox = document.createElement("div");
    selectionBox.style = `position:fixed;border:2px dashed #0060df;background:rgba(0,96,223,0.1);left:${startX}px;top:${startY}px;pointer-events:none;z-index:9999995;`;
    overlay.appendChild(selectionBox);

    function onMouseMove(moveEvent) {
      const currentX = moveEvent.clientX;
      const currentY = moveEvent.clientY;
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selectionBox.style.width = width + "px";
      selectionBox.style.height = height + "px";
      selectionBox.style.left = Math.min(currentX, startX) + "px";
      selectionBox.style.top = Math.min(currentY, startY) + "px";
    }

    function onMouseUp(upEvent) {
      overlay.removeEventListener("mousemove", onMouseMove);
      overlay.removeEventListener("mouseup", onMouseUp);

      const rect = selectionBox.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        showActionButtons(overlay, rect);
      } else {
        instructions.style.display = "block";
        window.addEventListener("mousemove", handleElementHover);
      }
    }

    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);
  });
}

function handleElementHover(e) {
  const overlay = document.getElementById("fx-screenshot-overlay");
  const instructions = document.getElementById("fx-instructions-panel");
  if (!overlay) return;

  if (e.target === instructions || instructions?.contains(e.target) || e.target.id === "fx-main-cancel-btn") {
    if (hoveredElement) {
      hoveredElement.style.outline = lastOutlineStyle;
      hoveredElement = null;
    }
    return;
  }

  overlay.style.pointerEvents = "none";
  if (instructions) instructions.style.pointerEvents = "none";

  const element = document.elementFromPoint(e.clientX, e.clientY);

  overlay.style.pointerEvents = "auto";
  if (instructions) instructions.style.pointerEvents = "auto";

  if (!element || element === document.body || element === document.documentElement || element.closest("#fx-screenshot-overlay")) {
    if (hoveredElement) {
      hoveredElement.style.outline = lastOutlineStyle;
      hoveredElement = null;
    }
    return;
  }

  if (element !== hoveredElement) {
    if (hoveredElement) {
      hoveredElement.style.outline = lastOutlineStyle;
    }
    hoveredElement = element;
    lastOutlineStyle = element.style.outline;
    element.style.outline = "2px dashed #ffffff";
  }
}

function handleElementClick(e) {
  const overlay = document.getElementById("fx-screenshot-overlay");
  if (!overlay || !hoveredElement) return;

  e.preventDefault();
  e.stopPropagation();

  const rect = hoveredElement.getBoundingClientRect();
  hoveredElement.style.outline = lastOutlineStyle;
  hoveredElement = null;

  window.removeEventListener("mousemove", handleElementHover);
  window.removeEventListener("click", handleElementClick, true);

  const instructions = document.getElementById("fx-instructions-panel");
  if (instructions) instructions.style.display = "none";
  hideQuickActionsPanel();

  const selectionBox = document.createElement("div");
  selectionBox.style = `position:fixed;border:2px dashed #0060df;background:rgba(0,96,223,0.1);left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:9999995;`;
  overlay.appendChild(selectionBox);

  showActionButtons(overlay, rect);
}

function showActionButtons(overlay, rect) {
  const existingPanel = document.getElementById("fx-btn-panel");
  if (existingPanel) existingPanel.remove();

  const buttonPanel = document.createElement("div");
  buttonPanel.id = "fx-btn-panel";
  buttonPanel.style = `position:fixed;left:${rect.left + rect.width - 245}px;top:${rect.top + rect.height + 10}px;display:flex;gap:8px;z-index:9999999;pointer-events:auto;`;

  const btnStyle = "padding:6px 14px;border:none;border-radius:4px;font-family:sans-serif;font-size:13px;font-weight:bold;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.3);";

  const copyBtn = document.createElement("button");
  copyBtn.innerText = "Copy";
  copyBtn.style = btnStyle + "background:#0060df;color:white;";
  copyBtn.onclick = () => processImage(rect, "copy");

  const dlBtn = document.createElement("button");
  dlBtn.innerText = "Download";
  dlBtn.style = btnStyle + "background:#f9f9fa;color:#15141a;border:1px solid #ccd0d9;";
  dlBtn.onclick = () => processImage(rect, "download");

  const cancelBtn = document.createElement("button");
  cancelBtn.innerText = "Cancel";
  cancelBtn.style = btnStyle + "background:#fff;color:#5a5a5a;border:1px solid #ccd0d9;";
  cancelBtn.onclick = () => closeAllScreenshotUI();

  buttonPanel.appendChild(cancelBtn);
  buttonPanel.appendChild(copyBtn);
  buttonPanel.appendChild(dlBtn);
  overlay.appendChild(buttonPanel);
}

function processImage(rect, action) {
  const base64Image = window.fxLastImage;
  if (!base64Image) {
    console.error("Screenshot pixel buffer missing.");
    closeAllScreenshotUI();
    return;
  }

  if (action === "copy") {
    // Synchronously create the promise to maintain user gesture validity
    const blobPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Image;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.drawImage(
          img,
          rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr,
          0, 0, rect.width * dpr, rect.height * dpr
        );

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        }, "image/png");
      };
      img.onerror = reject;
    });

    navigator.clipboard.write([
      new ClipboardItem({ "image/png": blobPromise })
    ]).catch(err => console.error("Clipboard error:", err));

    closeAllScreenshotUI();
  } else if (action === "download") {
    const img = new Image();
    img.src = base64Image;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.drawImage(
        img,
        rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr,
        0, 0, rect.width * dpr, rect.height * dpr
      );
      
      const link = document.createElement("a");
      link.download = `Firefox-Screenshot-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      closeAllScreenshotUI();
    };
  }
}
// ---------------------------------------------------------------------------
// Quick actions panel: "Save visible" / "Save full page" (top-right corner,
// available immediately without needing to drag-select or click an element).
// ---------------------------------------------------------------------------

const ICON_VISIBLE_SVG = `<svg width="26" height="20" viewBox="0 0 26 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="23" height="17" rx="2" stroke="#fbfbfe" stroke-width="2"/></svg>`;

const ICON_FULLPAGE_SVG = `<svg width="26" height="24" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="23" height="12" rx="2" stroke="#fbfbfe" stroke-width="2"/><rect x="1.5" y="16.5" width="23" height="6" rx="1" stroke="#fbfbfe" stroke-width="2" stroke-dasharray="3 2.5"/></svg>`;

function createQuickActionsPanel(overlay) {
  const panel = document.createElement("div");
  panel.id = "fx-quickactions-panel";
  panel.style = "position:fixed;top:16px;right:16px;background:#2b2a33;border:1px solid #52525e;border-radius:8px;display:flex;gap:4px;padding:6px;z-index:10000000;box-shadow:0 4px 16px rgba(0,0,0,0.4);pointer-events:auto;";

  panel.appendChild(createQuickActionButton("visible", "Save\nvisible", ICON_VISIBLE_SVG));
  panel.appendChild(createQuickActionButton("fullpage", "Save full\npage", ICON_FULLPAGE_SVG));

  overlay.appendChild(panel);
}

function createQuickActionButton(mode, label, iconSvg) {
  const btn = document.createElement("button");
  btn.dataset.fxMode = mode;
  btn.style = "display:flex;flex-direction:column;align-items:center;gap:6px;background:transparent;border:none;border-radius:6px;padding:10px 12px;cursor:pointer;color:#fbfbfe;font-family:sans-serif;font-size:12px;font-weight:500;width:78px;white-space:pre-line;line-height:1.3;transition:background 0.15s;";
  btn.onmouseenter = () => (btn.style.background = "rgba(255,255,255,0.1)");
  btn.onmouseleave = () => (btn.style.background = "transparent");
  btn.innerHTML = `${iconSvg}<span>${label}</span>`;
  btn.onclick = (e) => {
    e.stopPropagation();
    handleQuickAction(mode);
  };
  return btn;
}

function hideQuickActionsPanel() {
  const panel = document.getElementById("fx-quickactions-panel");
  if (panel) panel.style.display = "none";
}

function setQuickActionsBusy(busy) {
  const panel = document.getElementById("fx-quickactions-panel");
  if (!panel) return;
  panel.style.opacity = busy ? "0.5" : "1";
  panel.style.pointerEvents = busy ? "none" : "auto";
}

async function handleQuickAction(mode) {
  window.removeEventListener("mousemove", handleElementHover);
  window.removeEventListener("click", handleElementClick, true);

  const instructions = document.getElementById("fx-instructions-panel");
  if (instructions) instructions.style.display = "none";
  if (hoveredElement) {
    hoveredElement.style.outline = lastOutlineStyle;
    hoveredElement = null;
  }

  setQuickActionsBusy(true);

  let dataUrl = null;
  let label = mode;

  if (mode === "visible") {
    dataUrl = window.fxLastImage;
  } else if (mode === "fullpage") {
    dataUrl = await captureFullPageDataUrl();
  }

  setQuickActionsBusy(false);

  if (dataUrl) {
    downloadDataUrl(dataUrl, label);
  } else {
    console.error("Screenshot capture failed for mode:", mode);
  }

  closeAllScreenshotUI();
}

function downloadDataUrl(dataUrl, label) {
  const link = document.createElement("a");
  link.download = `Firefox-Screenshot-${label}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 300)));
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function requestVisibleCapture() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "capture-visible" }, (response) => {
      if (chrome.runtime.lastError || !response || response.error) {
        resolve(null);
      } else {
        resolve(response.dataUrl);
      }
    });
  });
}

// Scrolls through the page in viewport-height steps, capturing at each stop,
// and stitches the results into a single tall canvas. Known limitation:
// position:fixed/sticky elements (headers, cookie banners) will be baked into
// every step and appear repeated in the final image.
async function captureFullPageDataUrl() {
  const overlay = document.getElementById("fx-screenshot-overlay");
  if (overlay) overlay.style.visibility = "hidden";

  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;
  const dpr = window.devicePixelRatio || 1;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const totalHeight = Math.min(
    Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      viewportHeight
    ),
    32000 // stay under the ~32767px canvas dimension cap most browsers enforce
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewportWidth * dpr);
  canvas.height = Math.round(totalHeight * dpr);
  const ctx = canvas.getContext("2d");

  window.scrollTo(0, 0);
  await waitForPaint();

  const capturedOffsets = new Set();
  let targetY = 0;
  let finished = false;

  while (!finished) {
    window.scrollTo(0, targetY);
    await waitForPaint();
    const actualY = window.scrollY;

    if (!capturedOffsets.has(actualY)) {
      const shot = await requestVisibleCapture();
      if (shot) {
        try {
          const img = await loadImage(shot);
          ctx.drawImage(img, 0, Math.round(actualY * dpr));
        } catch (err) {
          console.error("Failed to draw capture step:", err);
        }
      }
      capturedOffsets.add(actualY);
      await delay(250); // keep total captureVisibleTab calls under the rate limit
    }

    if (actualY + viewportHeight >= totalHeight) {
      finished = true;
    } else {
      targetY = actualY + viewportHeight;
    }
  }

  window.scrollTo(originalScrollX, originalScrollY);

  return canvas.toDataURL("image/png");
}
