/** Helpers to build conversational lesson markdown (student asks → mentor explains). */

import { wrapSectionAsTextbook } from './textbook-format';

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
  chapter?: string;
  intro?: string;
  dialogues: { q: string; a: string }[];
  takeaways?: string[];
  tip?: string;
}): string {
  const chunks: string[] = [];

  if (parts.chapter) {
    chunks.push(`# ${parts.chapter}\n\n`);
  }
  if (parts.intro) {
    chunks.push(`## Chapter Overview\n\n${parts.intro}\n\n---\n\n`);
  }
  chunks.push(`## In-Depth Explanation\n\n`);
  chunks.push(
    `This section uses a **guided study format** — read each question as if you asked it in class, then study the mentor's detailed answer like textbook exposition.\n\n---\n\n`
  );

  for (const d of parts.dialogues) {
    chunks.push(dialogue(d.q, d.a));
  }
  if (parts.takeaways?.length) chunks.push(keyTakeaways(parts.takeaways));
  if (parts.tip) chunks.push(interviewTip(parts.tip));
  chunks.push(`\n---\n\n## Chapter Summary\n\n`);
  if (parts.takeaways?.length) {
    chunks.push(parts.takeaways.map((p) => `- ${p}`).join('\n'));
  } else {
    chunks.push(`- Review the key concepts above and explain them in your own words.\n- Complete the module quiz and practice questions.\n`);
  }
  return chunks.join('\n');
}

/** Wrap short module sections in textbook chapter format when no dedicated deep lesson exists. */
export function wrapSectionAsLesson(title: string, content: string, moduleTitle?: string): string {
  return wrapSectionAsTextbook(title, content, moduleTitle);
}
