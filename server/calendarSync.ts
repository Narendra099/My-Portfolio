import { google } from "googleapis";
import { config } from "./config.js";
import { loadOAuthClient } from "./googleAuth.js";
import { readJsonFile, writeJsonFile } from "./storage.js";

type TimeBlock = {
  start: string;
  end: string;
};

type AvailabilityPayload = {
  timezone: string;
  officeHours: { label: string; start: string; end: string };
  recurringBusy: Array<{ label: string; start: string; end: string }>;
  bestCollaboration: { label: string; start: string; end: string; day: string; isWeekend: boolean };
  freeBlocks: Array<{ day: string; start: string; end: string }>;
  upcomingBusy: Array<{ label: string; day: string; start: string; end: string }>;
  note: string;
  lastUpdatedAt: string;
};

const CACHE_FILE = "availability-cache.json";

function getLocalParts(dateString: string) {
  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return { weekday, minutes: hour * 60 + minute };
}

function toMinutes(dateString: string) {
  return getLocalParts(dateString).minutes;
}

function fromMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  const date = new Date(`2000-01-01T${hours}:${mins}:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatDateLabel(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(dateString));
}

function currentDateLabel() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function currentWeekdayShort() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function formatMinutesRange(start: number, end: number) {
  return {
    start: fromMinutes(start),
    end: fromMinutes(end),
  };
}

function median(values: number[]) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return sorted[middle];
}

function deriveAvailability(busyBlocks: TimeBlock[]): AvailabilityPayload {
  const weekdayBlocks = busyBlocks.filter(({ start }) => {
    const weekday = getLocalParts(start).weekday;
    return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);
  });

  const middayBlocks = weekdayBlocks.filter(({ start }) => {
    const minutes = toMinutes(start);
    return minutes >= 11 * 60 && minutes <= 13 * 60;
  });

  const starts = middayBlocks.map(({ start }) => toMinutes(start));
  const ends = middayBlocks.map(({ end }) => toMinutes(end));

  const recurringStart = median(starts) ?? 11 * 60 + 30;
  const recurringEnd = median(ends) ?? 12 * 60;

  const officeStart = 14 * 60;
  const officeEnd = 23 * 60;
  const busyByDay = new Map<string, Array<{ start: number; end: number }>>();
  const todayLabel = currentDateLabel();
  const isWeekend = ["Sat", "Sun"].includes(currentWeekdayShort());

  for (const block of weekdayBlocks) {
    const day = formatDateLabel(block.start);
    const start = toMinutes(block.start);
    const end = toMinutes(block.end);
    const list = busyByDay.get(day) ?? [];
    list.push({ start, end });
    busyByDay.set(day, list);
  }

  const freeBlocks: Array<{ day: string; start: string; end: string }> = [];
  let bestCollaboration = {
    label: "Best collaboration block",
    day: "No weekday availability found",
    start: "Not available",
    end: "Not available",
    isWeekend,
  };
  let bestSpan = -1;
  let todayBestCollaboration = {
    label: "Best collaboration block",
    day: todayLabel,
    start: "Not available",
    end: "Not available",
    isWeekend,
  };
  let todayBestSpan = -1;

  for (const [day, blocks] of busyByDay.entries()) {
    const sorted = blocks
      .map((block) => ({
        start: Math.max(block.start, officeStart),
        end: Math.min(block.end, officeEnd),
      }))
      .filter((block) => block.end > block.start)
      .sort((a, b) => a.start - b.start);

    let cursor = officeStart;

    for (const block of sorted) {
      if (block.start > cursor) {
        const range = formatMinutesRange(cursor, block.start);
        freeBlocks.push({ day, ...range });
        if (block.start - cursor > bestSpan) {
          bestSpan = block.start - cursor;
          bestCollaboration = {
            label: "Best collaboration block",
            day,
            ...range,
            isWeekend,
          };
        }
        if (day === todayLabel && block.start - cursor > todayBestSpan) {
          todayBestSpan = block.start - cursor;
          todayBestCollaboration = {
            label: "Best collaboration block",
            day,
            ...range,
            isWeekend,
          };
        }
      }
      cursor = Math.max(cursor, block.end);
    }

    if (cursor < officeEnd) {
      const range = formatMinutesRange(cursor, officeEnd);
      freeBlocks.push({ day, ...range });
      if (officeEnd - cursor > bestSpan) {
        bestSpan = officeEnd - cursor;
        bestCollaboration = {
          label: "Best collaboration block",
          day,
          ...range,
          isWeekend,
        };
      }
      if (day === todayLabel && officeEnd - cursor > todayBestSpan) {
        todayBestSpan = officeEnd - cursor;
        todayBestCollaboration = {
          label: "Best collaboration block",
          day,
          ...range,
          isWeekend,
        };
      }
    }
  }

  if (isWeekend) {
    bestCollaboration = {
      label: "Best collaboration block",
      day: "Weekend",
      start: "On request",
      end: "Weekend schedule varies",
      isWeekend: true,
    };
  } else if (todayBestSpan >= 0) {
    bestCollaboration = todayBestCollaboration;
  }

  return {
    timezone: "Asia/Kolkata",
    officeHours: {
      label: "Office hours",
      start: "2:00 PM",
      end: "11:00 PM",
    },
    recurringBusy: [
      {
        label: "Recurring weekday sync",
        start: fromMinutes(recurringStart),
        end: fromMinutes(recurringEnd),
      },
    ],
    bestCollaboration,
    freeBlocks: freeBlocks.slice(0, 6),
    upcomingBusy: weekdayBlocks.slice(0, 6).map((block, index) => ({
      label: `Busy window ${index + 1}`,
      day: formatDateLabel(block.start),
      start: formatTime(block.start),
      end: formatTime(block.end),
    })),
    note:
      "Availability is derived from your private Google Calendar sync and only exposes sanitized busy windows, not meeting titles.",
    lastUpdatedAt: new Date().toISOString(),
  };
}

export async function syncAvailability() {
  const auth = await loadOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 21);

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: horizon.toISOString(),
      timeZone: "Asia/Kolkata",
      items: [{ id: config.googleCalendarId }],
    },
  });

  const busy = response.data.calendars?.[config.googleCalendarId]?.busy ?? [];
  const payload = deriveAvailability(
    busy.flatMap((entry) =>
      entry.start && entry.end ? [{ start: entry.start, end: entry.end }] : [],
    ),
  );

  await writeJsonFile(CACHE_FILE, payload);
  return payload;
}

export async function readCachedAvailability() {
  return readJsonFile<AvailabilityPayload>(CACHE_FILE);
}

export async function getAvailability() {
  const cached = await readCachedAvailability();

  if (!cached) {
    return syncAvailability();
  }

  const ageMs = Date.now() - new Date(cached.lastUpdatedAt).getTime();
  if (ageMs > 10 * 60 * 1000) {
    return syncAvailability();
  }

  return cached;
}
