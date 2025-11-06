import { isMobile } from "@/utils/device.ts";

export function getDomain() {
  // get the param `return_url` in epay
  // get the domain from the window.location.origin property, e.g. https://example.com
  return window.location.origin;
}

export function getDeviceType() {
  const ua = navigator.userAgent;
  if (ua.match(/MicroMessenger/i) || ua.match(/Wechat/i)) {
    return "wechat";
  }

  if (ua.match(/Alipay/i) || ua.match(/AliApp/i) || ua.match(/AlipayClient/i)) {
    return "alipay";
  }

  if (ua.match(/QQ/i) || ua.match(/QQBrowser/i)) {
    return "qq";
  }

  return isMobile() ? "mobile" : "pc";
}
