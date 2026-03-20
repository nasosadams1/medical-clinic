// src/lib/socket.ts
import { io } from "socket.io-client";

const configuredDuelServerUrl =
  (import.meta.env.VITE_DUEL_SERVER_URL as string | undefined)?.trim() ||
  "";

const configuredDevDuelServerUrl =
  (import.meta.env.VITE_DUEL_SERVER_URL_DEV as string | undefined)?.trim() ||
  "";

const browserOrigin =
  typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";

const DUEL_SERVER_URL =
  configuredDevDuelServerUrl ||
  configuredDuelServerUrl ||
  (import.meta.env.DEV ? "http://localhost:5000" : browserOrigin);

const normalizedDuelServerUrl = DUEL_SERVER_URL.replace(/\/+$/, "");

const socket = io(normalizedDuelServerUrl, {
  transports: ["websocket", "polling"],
  rememberUpgrade: true,
  autoConnect: false,
  timeout: 10_000,
  reconnectionAttempts: 4,
  reconnectionDelay: 1_500,
  reconnectionDelayMax: 5_000,
});

export default socket;
