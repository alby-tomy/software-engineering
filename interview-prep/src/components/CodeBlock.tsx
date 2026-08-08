import type { CodeExample } from '../types/curriculum';
import './CodeBlock.css';

interface CodeBlockProps {
  example: CodeExample;
}

export function CodeBlock({ example }: CodeBlockProps) {
  return (
    <div className="code-example">
      <div className="code-example-header">
        <span className="code-example-title">{example.title}</span>
        <span className="code-example-lang">{example.language}</span>
      </div>
      <pre className="code-example-body"><code>{example.code}</code></pre>
      {example.explanation && (
        <p className="code-example-explanation">{example.explanation}</p>
      )}
    </div>
  );
}
