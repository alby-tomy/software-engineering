/** Helpers to build conversational lesson markdown (student asks → mentor explains). */

export function youAsk(question: string): string {
  return `#### 🧑‍💻 You ask\n\n> ${question}\n`;
}

export function mentor(answer: string): string {
  return `#### 🎓 Mentor explains\n\n${answer}\n`;
}

export function dialogue(question: string, answer: string): string {
  return `${youAsk(question)}${mentor(answer)}\n---\n`;
}

export function lessonIntro(text: string): string {
  return `${text}\n\n---\n\n`;
}

export function keyTakeaways(points: string[]): string {
  return `### ✅ Key takeaways\n\n${points.map((p) => `- ${p}`).join('\n')}\n`;
}

export function interviewTip(text: string): string {
  return `### 🎯 Interview tip\n\n${text}\n`;
}

export function buildLesson(parts: {
  intro?: string;
  dialogues: { q: string; a: string }[];
  takeaways?: string[];
  tip?: string;
}): string {
  const chunks: string[] = [];
  if (parts.intro) chunks.push(lessonIntro(parts.intro));
  for (const d of parts.dialogues) {
    chunks.push(dialogue(d.q, d.a));
  }
  if (parts.takeaways?.length) chunks.push(keyTakeaways(parts.takeaways));
  if (parts.tip) chunks.push(interviewTip(parts.tip));
  return chunks.join('\n');
}
