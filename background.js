chrome.commands.onCommand.addListener((command) => {
  if (command === "take-screenshot") { triggerCapture(); }
});

chrome.action.onClicked.addListener((tab) => { triggerCapture(); });

async function triggerCapture() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  // Stop script errors on restricted internal settings/browser tabs
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("edge://")) {
    return;
  }

  try {
    // 1. Take snapshot of active screen pixels
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });

    // 2. Clear old instances and set fresh global data payload variable directly onto the tab window context
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (imgData) => {
        window.fxLastImage = imgData;
      },
      args: [dataUrl]
    });

    // 3. Inject functional layer
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    // 4. Fire trigger command message signature down safely
    chrome.tabs.sendMessage(tab.id, { action: "start-selection" });
  } catch (error) {
    console.error("Capture execution chain blocked:", error);
  }
}

// Lets content.js request a fresh visible-tab capture at each scroll position
// while it stitches together a full-page screenshot.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "capture-visible") {
    if (!sender.tab) {
      sendResponse({ error: "No sender tab" });
      return false;
    }
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" })
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // keep the message channel open for the async response
  }
});
