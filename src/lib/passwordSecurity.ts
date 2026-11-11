const MIN_PASSWORD_LENGTH = 12;

const COMMON_PASSWORD_PARTS = [
  "password",
  "qwerty",
  "123456",
  "111111",
  "admin",
  "reelsporn",
  "vizyon",
];

export type PasswordCheck = {
  label: string;
  passed: boolean;
};

export function getPasswordChecks(password: string, email = ""): PasswordCheck[] {
  const lowerPassword = password.toLowerCase();
  const emailName = email.split("@")[0]?.toLowerCase();

  return [
    { label: `En az ${MIN_PASSWORD_LENGTH} karakter`, passed: password.length >= MIN_PASSWORD_LENGTH },
    { label: "Büyük ve küçük harf", passed: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "Rakam", passed: /\d/.test(password) },
    { label: "Sembol", passed: /[^A-Za-z0-9]/.test(password) },
    {
      label: "E-posta veya yaygın kelime içermez",
      passed:
        !COMMON_PASSWORD_PARTS.some((part) => lowerPassword.includes(part)) &&
        (!emailName || emailName.length < 3 || !lowerPassword.includes(emailName)),
    },
  ];
}

export function isStrongPassword(password: string, email = "") {
  return getPasswordChecks(password, email).every((check) => check.passed);
}

async function sha1Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return [...new Uint8Array(hashBuffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function isKnownBreachedPassword(password: string) {
  if (!password) return false;

  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });

  if (!response.ok) {
    throw new Error("Breached password check failed");
  }

  const text = await response.text();
  return text
    .split(/\r?\n/)
    .some((line) => line.split(":")[0]?.trim().toUpperCase() === suffix);
}
