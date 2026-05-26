import { prisma } from "@/lib/db/client";
import type { PublishedCopy } from "./snapshot-types";

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function endOfToday(): Date {
  const s = startOfToday();
  s.setHours(23, 59, 59, 999);
  return s;
}

export async function getPublishedCopyForDisplay(): Promise<PublishedCopy> {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const published = await prisma.generatedCopy.findMany({
    where: {
      status: "published",
      OR: [
        { validFor: { gte: todayStart, lte: todayEnd } },
        { validFor: null },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const byTemplate = (id: string) =>
    published.filter((p) => p.templateId === id).map((p) => p.content);

  return {
    sweatForecast: byTemplate("sweat-forecast")[0] ?? null,
    classPersonality: byTemplate("class-personality")[0] ?? null,
    reverseTestimonials: byTemplate("reverse-testimonial"),
  };
}
