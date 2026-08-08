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

/** Wrap short module sections in Q&A format when no dedicated deep lesson exists. */
export function wrapSectionAsLesson(title: string, content: string): string {
  return buildLesson({
    intro:
      'This lesson uses a **tutoring format**: you ask the question, the mentor explains in depth. Read each exchange carefully — this is your primary study material.',
    dialogues: [
      {
        q: `I'm studying "${title}". Can you walk me through everything I need to know for interviews?`,
        a: content,
      },
      {
        q: 'How should I practice this so it sticks?',
        a: `After reading, close the tab and **explain "${title}" out loud** in 2 minutes as if teaching a junior engineer. Then open the **Questions** tab in this module and answer 3 questions without looking. If you have a **Practical Exercise** below, do it — building beats reading.`,
      },
    ],
    tip: 'Sections with a "Deep lesson" badge have extended Q&A content written specifically for interview depth. All sections use this tutoring format.',
  });
}
