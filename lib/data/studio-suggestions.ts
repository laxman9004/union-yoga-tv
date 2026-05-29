import type { CopyTemplateId } from "@/lib/ai/templates";
import { buildFrameSnapshot } from "./snapshot";

export type StudioSuggestion = {
  suggestionKey: string;
  templateId: CopyTemplateId;
  label: string;
  content: string;
  reason: string;
};

export async function buildStudioSuggestions(): Promise<StudioSuggestion[]> {
  const snapshot = await buildFrameSnapshot();
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const suggestions: StudioSuggestion[] = [];

  const popular = snapshot.popularClassThisWeek?.classType ?? "Hot Union Flow";
  suggestions.push({
    suggestionKey: "sweat-forecast-today",
    templateId: "sweat-forecast",
    label: "Daily sweat forecast",
    content: `${day}. ${popular} on the board. Dress for heat.`,
    reason: `Most-booked class type this week: ${popular}`,
  });

  if (snapshot.upcomingClass) {
    const u = snapshot.upcomingClass;
    const time = new Date(u.startTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    suggestions.push({
      suggestionKey: "class-personality-upcoming",
      templateId: "class-personality",
      label: "Next class vibe",
      content: `${u.regularCount} regulars, ${u.firstTimerCount} newer — ${u.instructorName ?? "tonight"} at ${time}.`,
      reason: `${u.classType} · ${u.checkedInCount} checked in so far`,
    });
  }

  for (const m of snapshot.milestonesHitToday.slice(0, 3)) {
    suggestions.push({
      suggestionKey: `milestone-${m.memberId}-${m.target}`,
      templateId: "milestone-line",
      label: "Milestone today",
      content: `${m.firstName}${m.lastInitial ? ` ${m.lastInitial}.` : ""} hits class #${m.target} today.`,
      reason: `${m.lifetimeClassCount} classes so far`,
    });
  }

  for (const b of snapshot.birthdaysToday.slice(0, 2)) {
    suggestions.push({
      suggestionKey: `birthday-${b.firstName}-${b.lastInitial ?? "x"}`,
      templateId: "welcome-line",
      label: "Birthday in the room",
      content: `${b.firstName}${b.lastInitial ? ` ${b.lastInitial}.` : ""} — birthday class. Say hi at the desk.`,
      reason: "Birthday on file for today",
    });
  }

  return suggestions;
}
