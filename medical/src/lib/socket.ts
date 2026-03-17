// src/lib/socket.ts
import { io } from "socket.io-client";

const configuredDuelServerUrl =
  (import.meta.env.VITE_DUEL_SERVER_URL as string | undefined)?.trim() ||
  "";

const configuredDevDuelServerUrl =
  (import.meta.env.VITE_DUEL_SERVER_URL_DEV as string | undefined)?.trim() ||
  "";

const DUEL_SERVER_URL =
  configuredDevDuelServerUrl ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : configuredDuelServerUrl || "http://localhost:5000");

const normalizedDuelServerUrl = DUEL_SERVER_URL.replace(/\/+$/, "");

const socket = io(normalizedDuelServerUrl, {
  transports: ["websocket", "polling"],
  rememberUpgrade: true,
  autoConnect: true,
  timeout: 10_000,
});

export default socket;
