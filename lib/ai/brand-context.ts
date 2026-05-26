import { readFile } from "fs/promises";
import path from "path";

const VOICE_EXAMPLES = [
  "The mat doesn't ask you to be good. It asks you to show up.",
  "Progress, not perfection.",
  "Come as you are.",
  "Powell's largest hot yoga studio — built for your practice.",
  "26 & 2 is the same sequence every class. The student is what changes.",
  "Book the 6 a.m. class on the way to bed. Cancel from a meeting room.",
  "Some days the work is sweating. Some days the work is breathing. Both are practice.",
  "Beginners are the most welcome people in this studio. Always.",
];

export async function loadBrandContextBlock(): Promise<string> {
  const root = path.join(/* turbopackIgnore: true */ process.cwd(), "..");
  const files = [
    path.join(root, "content", "brand-voice.md"),
    path.join(root, "content", "raving-students.md"),
  ];
  const chunks: string[] = [
    "Union Yoga Studio — Powell, OH. Voice: warm, grounded, dry-witted, anti-wellness-cliche. No namaste, no journey, no crush it, no tribe, no manifest, no bliss. Sentence case. Specific over generic. Permission, not pressure.",
    "",
    "Example lines (match this tone):",
    ...VOICE_EXAMPLES.map((l) => `- ${l}`),
  ];
  for (const file of files) {
    try {
      const text = await readFile(file, "utf-8");
      chunks.push("", `--- From ${path.basename(file)} (excerpt) ---`, text.slice(0, 3500));
    } catch {
      /* optional parent-repo files */
    }
  }
  return chunks.join("\n");
}
