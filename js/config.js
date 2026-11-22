// 网页版配置。媒体地址只在这里改。
//
// 在线（默认）：用云函数 webmedia 换取临时播放链接。
// 云存储可以保持「仅创建者可读写」，不必改成所有用户可读。
// 使用前需要：部署 webmedia、开启匿名登录、把网站域名加到安全域名。
//
// 离线 U 盘：把 OFFLINE 改成 true，并把视频/封面按 catalog 路径放到 web/media/。
//
// 兑换码和「前 3 集免费」这次先不做：图书馆场景全部开放。
window.MIMI_CONFIG = {
  CLOUD_ENV: 'cloud1-d2guejnqud92f5860',
  MEDIA_PREFIX: 'cloud://cloud1-d2guejnqud92f5860.636c-cloud1-d2guejnqud92f5860-1537604764/',
  WEBMEDIA_FN: 'webmedia',
  OFFLINE: false
};
