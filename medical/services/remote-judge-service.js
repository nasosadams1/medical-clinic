import crypto from "crypto";

function hmacHex(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export class RemoteJudgeService {
  constructor({
    baseUrl,
    sharedSecret,
    timeoutMs = 25_000,
  }) {
    this.baseUrl = (baseUrl || "").replace(/\/+$/, "");
    this.sharedSecret = sharedSecret;
    this.timeoutMs = timeoutMs;
  }

  _sign(timestamp, bodyText) {
    return hmacHex(this.sharedSecret, `${timestamp}.${bodyText}`);
  }

  async executeCode(code, language, testCases) {
    if (!this.baseUrl) throw new Error("Remote judge base URL not configured");
    if (!this.sharedSecret) throw new Error("Remote judge shared secret not configured");

    const bodyObj = { code, language, testCases };
    const bodyText = JSON.stringify(bodyObj);
    const timestamp = Date.now().toString();
    const signature = this._sign(timestamp, bodyText);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/v1/judge/execute`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-timestamp": timestamp,
          "x-signature": signature,
        },
        body: bodyText,
        signal: controller.signal,
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = payload?.error || payload?.message || `Remote judge failed (${res.status})`;
        throw new Error(msg);
      }

      if (!payload || typeof payload !== "object") {
        throw new Error("Remote judge returned invalid payload");
      }

      return payload;
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error(`Remote judge timeout after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
