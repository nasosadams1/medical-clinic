import React, { useCallback, useEffect, useRef, useState } from "react";
import { loader } from "@monaco-editor/react";
import MatchmakingQueue from "./MatchmakingQueue";
import DuelArena from "./DuelArena";
import MatchResults from "./MatchResults";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { cacheDuelRating } from "../lib/duelRatingCache";
import toast from "react-hot-toast";
import socket from "../lib/socket";
import MascotIcon from "./branding/MascotIcon";

type View = "queue" | "arena" | "results";

const DEVICE_CLUSTER_STORAGE_KEY = "codhak-device-cluster-id";
const REGISTRATION_ACK_TIMEOUT_MS = 10_000;
const isDuelDebugEnabled = import.meta.env.DEV && import.meta.env.VITE_DEBUG_DUELS === "1";

const getOrCreateDeviceClusterId = () => {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.localStorage.getItem(DEVICE_CLUSTER_STORAGE_KEY);
    if (existing) return existing;

    const nextId =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    window.localStorage.setItem(DEVICE_CLUSTER_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return null;
  }
};

const buildClientMeta = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {};
  }

  return {
    deviceClusterId: getOrCreateDeviceClusterId(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform || "unknown",
    language: navigator.language || "unknown",
    origin: window.location.origin,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    screen: {
      width: window.screen?.width || null,
      height: window.screen?.height || null,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
};

export default function DuelsDashboard() {
  const { user, loading } = useAuth();
  const [duelUser, setDuelUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>("queue");
  const [matchData, setMatchData] = useState<any>(null);
  const [matchResults, setMatchResults] = useState<any>(null);
  const initializedRef = useRef(false);
  const registeredSocketKeyRef = useRef<string | null>(null);
  const registrationPromiseRef = useRef<Promise<boolean> | null>(null);

  const resetSocketRegistration = useCallback(() => {
    registeredSocketKeyRef.current = null;
    registrationPromiseRef.current = null;
  }, []);

  const ensureSocketRegistered = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!duelUser?.id || !socket?.connected) return false;

    const registrationKey = `${socket.id}:${duelUser.id}`;
    if (registeredSocketKeyRef.current === registrationKey) {
      return true;
    }

    if (registrationPromiseRef.current) {
      return registrationPromiseRef.current;
    }

    registrationPromiseRef.current = (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        if (!silent) {
          toast.error("Your session expired. Please sign in again.");
        }
        return false;
      }

      const username = duelUser.username?.trim() || "Player";
      const clientMeta = buildClientMeta();

      return new Promise<boolean>((resolve) => {
        socket.timeout(REGISTRATION_ACK_TIMEOUT_MS).emit(
          "register_player",
          {
            userId: duelUser.id,
            username,
            accessToken,
            clientMeta,
          },
          (err: any, res: any) => {
            if (err) {
              console.error("register_player failed", err);
              if (!silent) {
                toast.error("No response from the duel server. Try again in a moment.");
              }
              resolve(false);
              return;
            }

            if (!res?.ok) {
              if (!silent) {
                toast.error(res?.message || "Failed to register player");
              }
              resolve(false);
              return;
            }

            registeredSocketKeyRef.current = registrationKey;
            resolve(true);
          }
        );
      });
    })().finally(() => {
      registrationPromiseRef.current = null;
    });

    return registrationPromiseRef.current;
  }, [duelUser?.id, duelUser?.username]);

  useEffect(() => {
    resetSocketRegistration();
  }, [duelUser?.id, resetSocketRegistration]);

  useEffect(() => {
    const preload = loader.init();
    preload.catch((error: any) => {
      if (error?.type !== "cancelation") {
        console.error("Failed to preload Monaco", error);
      }
    });

    return () => {
      preload.cancel();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const initializeDuelUser = async () => {
      try {
        const { data: existingUser, error: fetchError } = await supabase
          .from("duel_users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching duel user:", fetchError);
          toast.error(fetchError.message);
          return;
        }

        if (cancelled) return;

        if (existingUser) {
          cacheDuelRating(user.id, existingUser.rating);
          setDuelUser(existingUser);
          return;
        }

        const username =
          user.user_metadata?.username ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Player";

        const { data: newUser, error: createError } = await supabase
          .from("duel_users")
          .insert({
            id: user.id,
            username,
            rating: 500,
            avatar_url: "",
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating duel user:", createError);
          toast.error(createError.message);
          return;
        }

        if (!cancelled) {
          cacheDuelRating(user.id, newUser.rating);
          setDuelUser(newUser);
        }
      } catch (e: any) {
        console.error("initializeDuelUser exception:", e);
        toast.error(e?.message || "Failed to initialize duel user");
      }
    };

    initializeDuelUser();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!duelUser?.id) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const onConnect = () => {
      if (isDuelDebugEnabled) {
        console.log("socket connected", socket.id);
      }
      void ensureSocketRegistered({ silent: true });
    };
    const onDisconnect = (reason: any) => {
      if (isDuelDebugEnabled) {
        console.log("socket disconnected", reason);
      }
      resetSocketRegistration();
    };
    const onConnectError = (e: any) => console.error("connect_error", e);
    const onServerIdentity = (d: any) => {
      if (isDuelDebugEnabled) {
        console.log("server_identity", d);
      }
    };
    const onServerError = (e: any) => {
      console.error("server_error", e);
      if (e?.message === "Player not registered" || e?.message === "Stale duel connection") {
        resetSocketRegistration();
        if (socket.connected) {
          void ensureSocketRegistered({ silent: true });
        }
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("server_identity", onServerIdentity);
    socket.on("server_error", onServerError);

    try {
      socket.emit("server_identity");
    } catch {
      // ignore
    }

    if (socket.connected) {
      void ensureSocketRegistered({ silent: true });
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("server_identity", onServerIdentity);
      socket.off("server_error", onServerError);
      resetSocketRegistration();
      initializedRef.current = false;
    };
  }, [duelUser?.id, ensureSocketRegistered, resetSocketRegistration]);

  const handleDuelStarted = (data: any) => {
    setMatchData(data);
    setCurrentView("arena");
  };

  const handleMatchEnd = (results: any) => {
    const currentPlayer =
      results?.playerA?.userId === duelUser?.id
        ? results.playerA
        : results?.playerB?.userId === duelUser?.id
        ? results.playerB
        : null;

    if (currentPlayer && Number.isFinite(Number(currentPlayer.ratingAfter))) {
      const nextRating = Number(currentPlayer.ratingAfter);
      cacheDuelRating(duelUser?.id, nextRating);
      setDuelUser((previous: any) => (
        previous ? { ...previous, rating: nextRating } : previous
      ));
    }

    setMatchResults({
      ...results,
      matchType: results?.matchType ?? matchData?.matchType ?? "ranked",
    });
    setCurrentView("results");
  };

  const handleCloseResults = () => {
    setCurrentView("queue");
    setMatchData(null);
    setMatchResults(null);
  };

  if (!user) {
    return (
      <div className="space-y-8 p-4 lg:p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <div className="h-7 w-7">
              <MascotIcon mascot="duel" className="h-full w-full" imageClassName="drop-shadow-sm" />
            </div>
            <span>1v1 Duels</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Enter the duel lobby with an account</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-muted-foreground">
            Ranked matchmaking is only available for signed-in players. You can still use the benchmark, open practice paths, and review pricing before you log in.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-secondary/35 p-4">
              <div className="text-sm font-semibold text-foreground">Ranked 1v1</div>
              <div className="mt-1 text-sm leading-7 text-muted-foreground">Compete live and win by passing all test cases first.</div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/35 p-4">
              <div className="text-sm font-semibold text-foreground">Persistent rating</div>
              <div className="mt-1 text-sm leading-7 text-muted-foreground">Your duel profile and rating are tied to your account.</div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/35 p-4">
              <div className="text-sm font-semibold text-foreground">How to join</div>
              <div className="mt-1 text-sm leading-7 text-muted-foreground">Use the Sign In / Sign Up button in the sidebar to unlock matchmaking.</div>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-secondary/35 p-5 text-sm text-muted-foreground">
            {loading ? "Checking your session..." : "No active account detected."}
          </div>
        </div>
      </div>
    );
  }

  if (!duelUser) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto mb-4 h-20 w-20">
            <MascotIcon mascot="duel" className="h-full w-full" imageClassName="drop-shadow-md" />
          </div>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div className="text-sm text-muted-foreground">Loading duel profile...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentView === "queue" && (
        <MatchmakingQueue
          socket={socket}
          rating={duelUser.rating}
          ensureSocketRegistered={ensureSocketRegistered}
          onMatchFound={handleDuelStarted}
          onMatchEnd={handleMatchEnd}
        />
      )}

      {currentView === "arena" && matchData && (
        <DuelArena
          matchId={matchData.matchId}
          problem={matchData.problem}
          opponent={matchData.opponent}
          matchType={matchData.matchType}
          socket={socket}
          userId={duelUser.id}
          ensureSocketRegistered={ensureSocketRegistered}
          resetSocketRegistration={resetSocketRegistration}
          startTime={matchData.startTime}
          endTime={matchData.endTime}
          serverNow={matchData.serverNow}
          onMatchEnd={handleMatchEnd}
        />
      )}

      {currentView === "results" && matchResults && (
        <MatchResults
          matchData={matchResults}
          userId={duelUser.id}
          onClose={handleCloseResults}
        />
      )}
    </>
  );
}

