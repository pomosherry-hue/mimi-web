// 网页版配置。媒体地址只在这里改。
//
// 在线预览：优先从腾讯云存储（MEDIA_BASE）加载 catalog 里的相对路径。
// 打不开或大约 6 秒还没出来时，自动改用 GitHub Pages 备份：
//   咪咪色彩英语 → PREVIEW_MEDIA_BASE（本仓库）
//   玩转色彩     → kids-color 站点
//
// 离线 U 盘：把 OFFLINE 改成 true，并把文件按 catalog 路径放到 media/。
//
// 云函数 webmedia 现在不用。兑换码和「前 3 集免费」这次先不做。
window.MIMI_CONFIG = {
  MEDIA_BASE: 'https://cloud1-d2guejnqud92f5860.storage.tcloudbase.com/',
  PREVIEW_MEDIA_BASE: 'https://pomosherry-hue.github.io/mimi-web/',
  KIDS_COLOR_BASE: 'https://pomosherry-hue.github.io/kids-color/',
  MEDIA_STALL_MS: 6000,
  CLOUD_ENV: 'cloud1-d2guejnqud92f5860',
  MEDIA_PREFIX: 'cloud://cloud1-d2guejnqud92f5860.636c-cloud1-d2guejnqud92f5860-1537604764/',
  WEBMEDIA_FN: 'webmedia',
  OFFLINE: false
};
