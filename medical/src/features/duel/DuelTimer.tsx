import { useEffect, useState } from "react";

type DuelTimerProps = {
  duration: number;
  onExpire: () => void;
};

export default function DuelTimer({ duration, onExpire }: DuelTimerProps) {
  const [time, setTime] = useState<number>(duration);

  useEffect(() => {
    setTime(duration);

    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, onExpire]);

  return <div>Time left: {time}s</div>;
}