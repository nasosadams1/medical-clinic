import React, { useEffect, useRef, useState } from "react";
import MatchmakingQueue from "./MatchmakingQueue";
import DuelArena from "./DuelArena";
import MatchResults from "./MatchResults";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import socket from "../lib/socket"; // ✅ single shared socket instance

type View = "queue" | "arena" | "results";

export default function DuelsDashboard() {
  const { user } = useAuth();

  const [duelUser, setDuelUser] = useState<any>(null);

  const [currentView, setCurrentView] = useState<View>("queue");
  const [matchData, setMatchData] = useState<any>(null);
  const [matchResults, setMatchResults] = useState<any>(null);

  const initializedRef = useRef(false);

  // Ensure duel_users exists for this auth user (id = auth.uid())
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
            rating: 1200,
            avatar_url: "",
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating duel user:", createError);
          toast.error(createError.message);
          return;
        }

        if (!cancelled) setDuelUser(newUser);
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

  // Setup socket listeners ONCE after duelUser exists (do not create socket here)
  useEffect(() => {
    if (!duelUser?.id) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const onConnect = () => console.log("✅ socket connected", socket.id);
    const onDisconnect = (reason: any) => console.log("⚠️ disconnected", reason);
    const onConnectError = (e: any) => console.error("❌ connect_error", e);
    const onServerIdentity = (d: any) => console.log("🧩 server_identity", d);
    const onServerError = (e: any) => {
      console.error("🚨 server_error", e);
      toast.error(e?.message || "Server error");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("server_identity", onServerIdentity);
    socket.on("server_error", onServerError);

    // Optional: ask server identity (only if your server supports it)
    try {
      socket.emit("server_identity");
    } catch {
      // ignore
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("server_identity", onServerIdentity);
      socket.off("server_error", onServerError);
      initializedRef.current = false;
    };
  }, [duelUser?.id]);

  const handleMatchFound = (data: any) => {
    setMatchData(data);
    setCurrentView("arena");
  };

  const handleMatchEnd = (results: any) => {
    setMatchResults(results);
    setCurrentView("results");
  };

  const handleCloseResults = () => {
    setCurrentView("queue");
    setMatchData(null);
    setMatchResults(null);
  };

  // We consider socket "ready" if it exists (it’s a singleton) — connection status is handled in UI
  if (!user || !duelUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {currentView === "queue" && (
        <MatchmakingQueue
          socket={socket}
          userId={duelUser.id}
          username={duelUser.username}
          rating={duelUser.rating}
          onMatchFound={handleMatchFound}
        />
      )}

      {currentView === "arena" && matchData && (
        <DuelArena
          matchId={matchData.matchId}
          problem={matchData.problem}
          opponent={matchData.opponent}
          socket={socket}
          userId={duelUser.id}
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