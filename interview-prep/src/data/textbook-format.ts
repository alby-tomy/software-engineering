/** Textbook-style lesson builder — structured chapters with overview, sections, examples, and summaries. */

export interface TextbookSection {
  title: string;
  content: string;
}

export interface TextbookExample {
  title: string;
  code?: string;
  language?: string;
  explanation: string;
}

export interface TextbookDefinition {
  term: string;
  definition: string;
}

export function chapterOverview(text: string): string {
  return `## Chapter Overview\n\n${text}\n\n---\n`;
}

export function learningObjectives(objectives: string[]): string {
  return `### Learning Objectives\n\nAfter reading this chapter, you will be able to:\n\n${objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\n---\n`;
}

export function sectionHeading(number: number, title: string): string {
  return `## ${number}. ${title}\n\n`;
}

export function definitionBox(definitions: TextbookDefinition[]): string {
  const items = definitions
    .map((d) => `**${d.term}** — ${d.definition}`)
    .join('\n\n');
  return `> **Key Definitions**\n>\n> ${items.split('\n').join('\n> ')}\n\n`;
}

export function workedExample(example: TextbookExample): string {
  let block = `### Worked Example: ${example.title}\n\n`;
  if (example.code) {
    block += `\`\`\`${example.language ?? ''}\n${example.code}\n\`\`\`\n\n`;
  }
  block += `${example.explanation}\n\n`;
  return block;
}

export function commonPitfalls(items: string[]): string {
  return `### ⚠️ Common Pitfalls\n\n${items.map((p) => `- ${p}`).join('\n')}\n\n`;
}

export function chapterSummary(points: string[]): string {
  return `---\n\n## Chapter Summary\n\n${points.map((p) => `- ${p}`).join('\n')}\n\n`;
}

export function reviewQuestions(questions: { q: string; hint: string }[]): string {
  return `### Review Questions\n\n${questions.map((item, i) => `**${i + 1}.** ${item.q}\n\n*Hint: ${item.hint}*\n`).join('\n')}\n`;
}

export function buildTextbookLesson(parts: {
  chapter: string;
  overview: string;
  objectives?: string[];
  definitions?: TextbookDefinition[];
  sections: TextbookSection[];
  example?: TextbookExample;
  pitfalls?: string[];
  summary: string[];
  reviewQuestions?: { q: string; hint: string }[];
}): string {
  const chunks: string[] = [];
  chunks.push(`# ${parts.chapter}\n\n`);
  chunks.push(chapterOverview(parts.overview));
  if (parts.objectives?.length) chunks.push(learningObjectives(parts.objectives));
  if (parts.definitions?.length) chunks.push(definitionBox(parts.definitions));

  parts.sections.forEach((sec, i) => {
    chunks.push(sectionHeading(i + 1, sec.title));
    chunks.push(`${sec.content}\n\n`);
  });

  if (parts.example) chunks.push(workedExample(parts.example));
  if (parts.pitfalls?.length) chunks.push(commonPitfalls(parts.pitfalls));
  chunks.push(chapterSummary(parts.summary));
  if (parts.reviewQuestions?.length) chunks.push(reviewQuestions(parts.reviewQuestions));

  return chunks.join('');
}

/** Parse module section markdown (### headers) into textbook sections. */
export function parseContentSections(content: string): TextbookSection[] {
  const parts = content.split(/^### /m).filter(Boolean);
  if (parts.length === 0) return [{ title: 'Core Concepts', content: content.trim() }];
  return parts.map((part) => {
    const nl = part.indexOf('\n');
    const title = nl === -1 ? part.trim() : part.slice(0, nl).trim();
    const body = nl === -1 ? '' : part.slice(nl + 1).trim();
    return { title, content: body };
  });
}

/** Wrap thin module content in full textbook chapter scaffolding. */
export function wrapSectionAsTextbook(
  title: string,
  content: string,
  moduleTitle?: string
): string {
  const parsed = parseContentSections(content);
  const expandedSections = parsed.map((sec) => ({
    title: sec.title,
    content:
      sec.content +
      (sec.content.length < 400
        ? `\n\n**In practice:** Study this concept by explaining "${sec.title}" aloud in your own words, then find one real production scenario where it applies. Senior interviews reward concrete examples, not definitions alone.`
        : ''),
  }));

  return buildTextbookLesson({
    chapter: title,
    overview: `This chapter is part of **${moduleTitle ?? 'the software engineering curriculum'}**. It explains **${title}** in textbook depth — definitions, how things work internally, practical usage, and what interviewers expect at senior level. Read sequentially; each section builds on the previous.`,
    objectives: [
      `Define and explain the core ideas behind ${title}`,
      `Apply these concepts to real backend and production scenarios`,
      `Compare alternatives and articulate trade-offs clearly`,
      `Recognize common mistakes and how to avoid them`,
    ],
    sections: expandedSections,
    pitfalls: [
      'Memorizing definitions without understanding when and why to apply them',
      'Skipping hands-on practice — build a small example after reading',
      'Ignoring trade-offs — senior interviews always ask "what else did you consider?"',
    ],
    summary: parsed.map((s) => `Understand ${s.title} and when it matters in production systems`),
    reviewQuestions: [
      {
        q: `Explain ${title} to a junior engineer in 2 minutes.`,
        hint: 'Use one analogy and one concrete example from backend or systems work.',
      },
      {
        q: 'What trade-offs or alternatives should you mention in an interview?',
        hint: 'Name at least two options and when you would choose each.',
      },
      {
        q: 'What could go wrong in production if you misunderstand this topic?',
        hint: 'Think about failures, scale, security, or maintainability.',
      },
    ],
  });
}
