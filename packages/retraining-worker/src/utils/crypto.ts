const encoder = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function decodePkcs8(signingKeyB64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(signingKeyB64, "base64"));
  }
  const raw = atob(signingKeyB64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export async function signPayload(payload: string, signingKeyB64: string): Promise<string> {
  const raw = decodePkcs8(signingKeyB64);
  const keyData = new Uint8Array(Array.from(raw));
  const key = await crypto.subtle.importKey("pkcs8", keyData, { name: "Ed25519" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("Ed25519", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function hdDeriveCandidateId(serial: number, signingKeyB64: string): Promise<string> {
  const path = `m/44'/256'/0'/0/${serial}`;
  const hash = await sha256Hex(`${signingKeyB64}|${path}`);
  return `c-${hash.slice(0, 24)}`;
}
