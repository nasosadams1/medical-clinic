import { useEffect, useState } from "react";
import PythonEditor from "./PythonEditor";
import DuelTimer from "./DuelTimer";
import socket from "../../lib/socket";

/* ---------------- TYPES ---------------- */

type TestCase = {
  input: string;
  expected_output: string;
};

type DuelProblem = {
  id: string;
  title: string;
  description: string;
  time_limit_ms: number;
  samples: TestCase[];
};

type DuelStartPayload = {
  problem: DuelProblem;
};

type DuelEndPayload = {
  winnerId: string;
};

/* ---------------- COMPONENT ---------------- */

export default function DuelPage() {
  const [problem, setProblem] = useState<DuelProblem | null>(null);
  const [code, setCode] = useState<string>("");

  useEffect(() => {
    socket.connect();

    const handleStart = (data: DuelStartPayload) => {
      setProblem(data.problem);
    };

    const handleEnd = (data: DuelEndPayload) => {
      alert(`Winner: ${data.winnerId}`);
    };

    socket.on("duel_start", handleStart);
    socket.on("duel_end", handleEnd);

    return () => {
      socket.off("duel_start", handleStart);
      socket.off("duel_end", handleEnd);
      socket.disconnect();
    };
  }, []);

  if (!problem) return <div>Waiting for duel...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>{problem.title}</h2>
      <p>{problem.description}</p>

      <DuelTimer
        duration={problem.time_limit_ms / 1000}
        onExpire={() => alert("Time expired")}
      />

      <PythonEditor code={code} setCode={setCode} />

      <button
        onClick={() =>
          socket.emit("duel_submit", {
            matchId: problem.id,
            code,
          })
        }
      >
        Submit
      </button>
    </div>
  );
}