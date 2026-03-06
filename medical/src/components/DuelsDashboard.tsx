import React, { useEffect, useRef, useState } from "react";
import MatchmakingQueue from "./MatchmakingQueue";
import DuelArena from "./DuelArena";
import MatchResults from "./MatchResults";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import socket from "../lib/socket";

type View = "queue" | "arena" | "results";

export default function DuelsDashboard() {
  const { user, loading } = useAuth();
  const [duelUser, setDuelUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>("queue");
  const [matchData, setMatchData] = useState<any>(null);
  const [matchResults, setMatchResults] = useState<any>(null);
  const initializedRef = useRef(false);

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

  useEffect(() => {
    if (!duelUser?.id) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const onConnect = () => console.log("socket connected", socket.id);
    const onDisconnect = (reason: any) => console.log("socket disconnected", reason);
    const onConnectError = (e: any) => console.error("connect_error", e);
    const onServerIdentity = (d: any) => console.log("server_identity", d);
    const onServerError = (e: any) => {
      console.error("server_error", e);
      toast.error(e?.message || "Server error");
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

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("server_identity", onServerIdentity);
      socket.off("server_error", onServerError);
      initializedRef.current = false;
    };
  }, [duelUser?.id]);

  const handleDuelStarted = (data: any) => {
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
            1v1 Duels
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Enter the duel lobby with an account</h1>
          <p className="mt-3 max-w-2xl text-base text-gray-600">
            Ranked matchmaking is only available for signed-in players. You can still browse lessons, the store, and the leaderboard without logging in.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Ranked 1v1</div>
              <div className="mt-1 text-sm text-gray-600">Compete live and win by passing all test cases first.</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Persistent rating</div>
              <div className="mt-1 text-sm text-gray-600">Your duel profile and rating are tied to your account.</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">How to join</div>
              <div className="mt-1 text-sm text-gray-600">Use the Sign In / Sign Up button in the sidebar to unlock matchmaking.</div>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
            {loading ? "Checking your session..." : "No active account detected."}
          </div>
        </div>
      </div>
    );
  }

  if (!duelUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
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
          onMatchFound={handleDuelStarted}
          onMatchEnd={handleMatchEnd}
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
