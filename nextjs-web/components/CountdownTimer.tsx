"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/use-translation";

interface CountdownTimerProps {
  nextDueAt: string | Date | null | undefined;
  status: string;
  className?: string;
}

export function CountdownTimer({
  nextDueAt,
  status,
  className = "",
}: CountdownTimerProps) {
  const { t } = useTranslation();
  const [remainingTime, setRemainingTime] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
  } | null>(null);

  useEffect(() => {
    if (!nextDueAt || status === "completed") {
      setRemainingTime(null);
      return;
    }

    const calculateRemaining = () => {
      const now = new Date();
      // Parse nextDueAt - handle both string and Date
      const dueDate = new Date(nextDueAt);

      if (isNaN(dueDate.getTime())) {
        setRemainingTime(null);
        return;
      }

      const diff = dueDate.getTime() - now.getTime();
      const isOverdue = diff < 0;
      const absDiff = Math.abs(diff);

      const hours = Math.floor(absDiff / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

      setRemainingTime({ hours, minutes, seconds, isOverdue });
    };

    // Calculate immediately
    calculateRemaining();

    // Update every second
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [nextDueAt, status]);

  if (!remainingTime) {
    if (status === "completed") {
      return (
        <span className={`text-muted-foreground ${className}`}>
          {t("records.completed")}
        </span>
      );
    }
    return <span className={`text-muted-foreground ${className}`}>-</span>;
  }

  const formatTime = (value: number) => String(value).padStart(2, "0");
  const timeString = `${formatTime(remainingTime.hours)}:${formatTime(
    remainingTime.minutes
  )}:${formatTime(remainingTime.seconds)}`;

  if (remainingTime.isOverdue) {
    return (
      <span className={`text-destructive font-medium ${className}`}>
        {timeString} {t("records.overdue")}
      </span>
    );
  }

  return (
    <span className={`text-blue-600 font-medium ${className}`}>
      {timeString}
    </span>
  );
}
