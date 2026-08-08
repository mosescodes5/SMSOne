// Minimal RFC 6238 TOTP generator, computed entirely client-side via the
// Web Crypto API — the secret never leaves the browser. Lets users generate
// the same 6-digit codes an authenticator app (Google Authenticator, Authy,
// etc.) would produce from a Base32 secret, e.g. for accounts where they've
// saved the setup key but don't have the app handy.

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input) {
  const clean = input.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) throw new Error("Invalid character in secret — use A-Z and 2-7 only.");
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

function intToBytes(num) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // JS numbers are safe integers well beyond any realistic time-step count,
  // so splitting into high/low 32-bit halves is enough.
  view.setUint32(0, Math.floor(num / 2 ** 32));
  view.setUint32(4, num % 2 ** 32);
  return new Uint8Array(buf);
}

/** Returns the current 6-digit TOTP code and the seconds left in this window. */
export async function generateTotp(base32Secret, { digits = 6, period = 30 } = {}) {
  const keyBytes = base32Decode(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / period);
  const counterBytes = intToBytes(counter);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = (binCode % 10 ** digits).toString().padStart(digits, "0");
  const secondsLeft = period - (Math.floor(Date.now() / 1000) % period);

  return { code, secondsLeft, period };
}
