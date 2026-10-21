const initializedHosts = new WeakSet();
let lastSourceDates = {};
let localRefreshPromise = null;
let lastLocalCheck = 0;
const onDriverPage = () => location.hash.slice(1).split("/")[0] === "weather_driver_detection";
const host = () => document.querySelector(".weather-driver-page-host");
const onWeatherPage = () => onDriverPage() || location.hash.slice(1).split("/")[0] === "weather_history";
function applyLocalImages(items = []) {
  if (!onWeatherPage()) return;
  const target = onDriverPage() ? host() : document.querySelector(".weather-history-page-host");
  if (!target) return;
  for (const item of items) {
    const image = onDriverPage()
      ? [...target.querySelectorAll("img")].find(image => (image.dataset.weatherAsset || image.getAttribute("src")) === item.asset)
      : item.id === "cpc_rubber_daily" ? target.querySelector("img") : null;
    if (!image) continue;
    const card = image.closest(".chart-item");
    let notice = card?.querySelector("[data-weather-local-notice]");
    if (card && !notice) {
      notice = document.createElement("p");
      notice.className = "weather-local-image-notice";
      notice.dataset.weatherLocalNotice = "true";
      image.parentElement.append(notice);
    }
    const date = card?.querySelector(".chart-caption [data-update-key$='_date']");
    if (date && !date.dataset.weatherAnalysisLabel) date.dataset.weatherAnalysisLabel = date.textContent;
    const message = item.error || (item.analysisPending ? "图片已自动读取本地最新成品；解读仍为上一版，请点击更新。" : "");
    if (notice) { notice.textContent = message; notice.hidden = !message; }
    if (date) {
      date.textContent = item.error ? "本地最新图片暂不可用" : item.analysisPending ? "本地图片已更新 · 解读待更新" : date.dataset.weatherAnalysisLabel;
      date.title = item.analysisPending ? `上一版解读资料日期：${date.dataset.weatherAnalysisLabel}` : "";
    }
    image.title = item.error || `实时读取本地成品；文件修改时间 ${dateLabel(item.modifiedAt)}（不代表资料日期）`;
    if (!item.url || item.error || image.dataset.localHash === item.sha256) continue;
    image.removeAttribute("onerror");
    image.hidden = false;
    image.onload = () => { image.hidden = false; };
    image.onerror = () => {
      image.dataset.localHash = "";
      image.title = "本地图片读取失败，等待下次复查";
      if (notice) { notice.hidden = false; notice.textContent = "本地最新图片读取失败，暂保留上一版图与解读。"; }
      if (image.dataset.publishedSrc) {
        image.onerror = null;
        image.src = image.dataset.publishedSrc;
      }
    };
    image.dataset.localHash = item.sha256;
    image.src = item.url;
  }
  if (onDriverPage()) {
    const report = target.querySelector(".integrated-report");
    const message = items.some(item => item.error)
      ? "部分本地最新图片暂不可用；报告文字仍为上次成功解读。"
      : items.some(item => item.analysisPending)
        ? "本地图片已自动读取最新成品；报告文字仍为上一版，请点击更新处理变化图片及相关摘要。" : "";
    let notice = report?.querySelector("[data-weather-local-summary-notice]");
    if (report && !notice && message) {
      notice = document.createElement("p");
      notice.className = "weather-local-image-notice";
      notice.dataset.weatherLocalSummaryNotice = "true";
      report.prepend(notice);
    }
    if (notice) { notice.textContent = message; notice.hidden = !message; }
  }
}
async function refreshLocalImages() {
  if (!onWeatherPage() || document.visibilityState === "hidden") return;
  if (localRefreshPromise) return localRefreshPromise;
  if (Date.now() - lastLocalCheck < 500) return;
  lastLocalCheck = Date.now();
  localRefreshPromise = (async () => {
    const response = await fetch("/api/weather/local-images", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "本地图片复查失败");
    document.querySelector("[data-weather-local-error]")?.remove();
    if (host()) delete host().dataset.localImageError;
    applyLocalImages(payload.images);
  })().catch(error => {
    const image = document.querySelector(".weather-history-page-host img");
    if (image) image.title = error.message;
    const target = host();
    if (target) {
      target.dataset.localImageError = error.message;
      let notice = target.querySelector("[data-weather-local-error]");
      if (!notice) {
        notice = document.createElement("p");
        notice.className = "weather-local-image-notice";
        notice.dataset.weatherLocalError = "true";
        target.prepend(notice);
      }
      notice.textContent = `无法确认本地最新图片，暂保留已显示内容：${error.message}`;
    }
  }).finally(() => { localRefreshPromise = null; });
  return localRefreshPromise;
}
function dateLabel(value) {
  if (!value) return "暂无记录";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", hour12: false, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(parsed);
  const part = type => parts.find(item => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
}
function showUpdated(value) {
  document.querySelectorAll("[data-weather-last-updated]").forEach(node => {
    node.textContent = `最后成功更新：${dateLabel(value)}`;
    node.dataset.updatedAt = value || "";
  });
  const header = document.querySelector("[data-weather-header-updated]");
  if (header) header.textContent = dateLabel(value);
}
async function loadReport(target = host()) {
  if (!target) return;
  const response = await fetch("/api/weather/report", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "天气报告暂时无法加载");
  if (!target.isConnected) return;
  if (!target.querySelector(".integrated-report")) target.innerHTML = payload.html;
  target.querySelectorAll("[data-update-key]").forEach(node => {
    const value = payload.data[node.dataset.updateKey];
    if (typeof value === "string" && node.tagName !== "IMG") {
      node.textContent = value;
      delete node.dataset.weatherAnalysisLabel;
    }
  });
  target.querySelectorAll("img").forEach(image => {
    const asset = image.dataset.weatherAsset || image.getAttribute("src");
    image.dataset.weatherAsset = asset;
    image.src = payload.assetBase + asset + `?v=${encodeURIComponent(payload.version)}`;
    image.dataset.publishedSrc = image.src;
    delete image.dataset.localHash;
    image.decoding = "async";
  });
  target.dataset.weatherLoaded = "true";
  lastSourceDates = payload.sourceDates || {};
  showUpdated(payload.lastUpdatedAt);
  applyLocalImages(payload.localImages);
}
function initializePage() {
  const target = onDriverPage() ? host() : document.querySelector(".weather-history-page-host");
  if (!onWeatherPage() || !target || initializedHosts.has(target)) return;
  initializedHosts.add(target);

  if (!onDriverPage()) { refreshLocalImages(); return; }
  loadReport(target).catch(error => {
    if (target.isConnected) {
      target.textContent = error.message;
      target.dataset.weatherLoaded = "failed";
    }
  });

}
const appRoot = document.querySelector("#app");
if(appRoot)new MutationObserver(initializePage).observe(appRoot,{childList:true,subtree:true});
window.addEventListener("hashchange",initializePage);
initializePage();
