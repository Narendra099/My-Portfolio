import { useEffect, useState } from "react";
import { schedule as fallbackSchedule, type ScheduleBlock } from "./data";

type AvailabilityResponse = {
  officeHours: { label: string; start: string; end: string };
  timezone: string;
  recurringBusy: Array<{ label: string; start: string; end: string }>;
  bestCollaboration: { label: string; day: string; start: string; end: string; isWeekend: boolean };
  freeBlocks: Array<{ day: string; start: string; end: string }>;
  upcomingBusy: Array<{ label: string; day: string; start: string; end: string }>;
  note: string;
  lastUpdatedAt: string;
};

export type BusyWindow = {
  day: string;
  start: string;
  end: string;
};

export type AvailabilitySummary = {
  officeHours: string;
  bestCollaboration: string;
  bestCollaborationNote: string;
  timezone: string;
  note: string;
  lastUpdatedAt: string;
};

function toScheduleBlocks(data: AvailabilityResponse): ScheduleBlock[] {
  return [
    {
      day: "Office Hours",
      window: `${data.officeHours.start} - ${data.officeHours.end}`,
      focus: "My regular weekday work schedule, shown in Asia/Kolkata time.",
    },
    {
      day: "Best Collaboration",
      window: data.bestCollaboration.isWeekend
        ? data.bestCollaboration.start
        : `${data.bestCollaboration.start} - ${data.bestCollaboration.end}`,
      focus: data.bestCollaboration.isWeekend
        ? "Weekend schedule varies, so collaboration is handled on request."
        : `Longest free window during office hours on ${data.bestCollaboration.day}.`,
    },
    {
      day: "Timezone",
      window: data.timezone,
      focus: `${data.note} Last synced ${new Date(data.lastUpdatedAt).toLocaleString("en-IN")}.`,
    },
  ];
}

async function readJsonOrThrow(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error("Backend returned an empty response. Make sure the calendar server is running.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      "Backend returned a non-JSON response. Check that `npm run server` is running and healthy.",
    );
  }
}

export function useAvailability() {
  const [schedule, setSchedule] = useState<ScheduleBlock[]>(fallbackSchedule);
  const [upcomingBusy, setUpcomingBusy] = useState<BusyWindow[]>([]);
  const [freeBlocks, setFreeBlocks] = useState<BusyWindow[]>([]);
  const [connected, setConnected] = useState(false);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const authStatus = await fetch("/api/auth/status");
        if (!authStatus.ok) {
          throw new Error("Unable to check calendar connection. Is the backend running?");
        }

        const authPayload = (await readJsonOrThrow(authStatus)) as { connected?: boolean };
        setConnected(Boolean(authPayload.connected));

        if (!authPayload.connected) {
          setLoading(false);
          return;
        }

        const availabilityResponse = await fetch("/api/availability");
        if (!availabilityResponse.ok) {
          throw new Error("Unable to fetch live availability");
        }

        const payload = (await readJsonOrThrow(availabilityResponse)) as AvailabilityResponse;
        setSchedule(toScheduleBlocks(payload));
        setUpcomingBusy(payload.upcomingBusy.map(({ day, start, end }) => ({ day, start, end })));
        setFreeBlocks(payload.freeBlocks);
        setLiveLoaded(true);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load availability");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return { schedule, upcomingBusy, freeBlocks, connected, liveLoaded, loading, error };
}
