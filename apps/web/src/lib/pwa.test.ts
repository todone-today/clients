import { test } from "node:test";
import assert from "node:assert/strict";
import { detect } from "./pwa.ts";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36";
const ANDROID_WEBVIEW =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

test("detect: the phone, and whether this browser can install", () => {
  assert.deepEqual(detect(IPHONE_SAFARI), { platform: "ios", inApp: false, iosOtherBrowser: false });
  assert.equal(detect(IPAD, 5).platform, "ios"); // iPadOS calls itself a Mac; its touch screen gives it away
  assert.equal(detect(MAC, 0).platform, "other");
  assert.equal(detect(IPHONE_CHROME).iosOtherBrowser, true);
  assert.equal(detect(IPHONE_INSTAGRAM).inApp, true);
  assert.deepEqual(detect(ANDROID_CHROME), { platform: "android", inApp: false, iosOtherBrowser: false });
  assert.equal(detect(ANDROID_WEBVIEW).inApp, true); // an app's built-in browser on Android
});
