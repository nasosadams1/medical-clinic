// src/lib/socket.ts
import { io } from "socket.io-client";

const DUEL_SERVER_URL =
  (import.meta.env.VITE_DUEL_SERVER_URL as string | undefined)?.trim() ||
  "http://localhost:5000";

const normalizedDuelServerUrl = DUEL_SERVER_URL.replace(/\/+$/, "");

const socket = io(normalizedDuelServerUrl, {
  transports: ["polling", "websocket"],
  autoConnect: true,
});

export default socket;
