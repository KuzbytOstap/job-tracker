function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d");

  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#c2410c");
  gradient.addColorStop(1, "#be123c");

  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(0, 0, size, size, size * 0.28);
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.round(size * 0.62)}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("J", size / 2, size / 2 + size * 0.04);

  return context.getImageData(0, 0, size, size);
}

function setToolbarIcon() {
  try {
    chrome.action.setIcon({
      imageData: {
        16: drawIcon(16),
        32: drawIcon(32),
        48: drawIcon(48),
        128: drawIcon(128),
      },
    });
  } catch {
    return;
  }
}

chrome.runtime.onInstalled.addListener(setToolbarIcon);
chrome.runtime.onStartup.addListener(setToolbarIcon);
