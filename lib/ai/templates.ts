export const COPY_TEMPLATES = [
  {
    id: "sweat-forecast",
    label: "Daily sweat forecast",
    maxWords: 12,
    description: "One line — weather + day + vibe",
  },
  {
    id: "reverse-testimonial",
    label: "Reverse testimonial",
    maxWords: 35,
    description: "Two contradictory sentences, ends in praise",
  },
  {
    id: "class-personality",
    label: "Class personality",
    maxWords: 18,
    description: "Tonight's room vibe (composition)",
  },
  {
    id: "welcome-line",
    label: "Welcome line",
    maxWords: 12,
    description: "Under check-in name",
  },
  {
    id: "milestone-line",
    label: "Milestone line",
    maxWords: 30,
    description: "Celebration copy",
  },
] as const;

export type CopyTemplateId = (typeof COPY_TEMPLATES)[number]["id"];

export function getTemplate(id: string) {
  return COPY_TEMPLATES.find((t) => t.id === id);
}
