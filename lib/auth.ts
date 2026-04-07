import { randomUUID, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const USERS_FILE = path.join(process.cwd(), "data", "local-users.json");
const SESSION_COOKIE = "finboard_session";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type UserStore = {
  users: StoredUser[];
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

function getSecret() {
  return process.env.AUTH_SECRET ?? "finboard-local-secret";
}

async function ensureUserStore() {
  await mkdir(path.dirname(USERS_FILE), { recursive: true });
  try {
    await readFile(USERS_FILE, "utf8");
  } catch {
    await writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2), "utf8");
  }
}

async function readStore(): Promise<UserStore> {
  await ensureUserStore();
  const raw = await readFile(USERS_FILE, "utf8");
  return JSON.parse(raw) as UserStore;
}

async function saveStore(store: UserStore) {
  await writeFile(USERS_FILE, JSON.stringify(store, null, 2), "utf8");
}

function hashPassword(password: string) {
  const salt = randomUUID();
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  const derived = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");
  return timingSafeEqual(derived, storedBuffer);
}

export async function createUser(name: string, email: string, password: string): Promise<SessionUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const store = await readStore();
  if (store.users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Account already exists");
  }

  const user: StoredUser = {
    id: randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  store.users.push(user);
  await saveStore(store);

  return { id: user.id, name: user.name, email: user.email };
}

export async function authenticateUser(email: string, password: string): Promise<SessionUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const store = await readStore();
  const user = store.users.find((entry) => entry.email === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }

  return { id: user.id, name: user.name, email: user.email };
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function encodeSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token?: string | null): SessionUser | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
