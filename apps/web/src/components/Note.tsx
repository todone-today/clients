// A task description in simple Markdown: **bold**, _italic_, [links](https://…), bare links, and "- " lists.
// Built as React elements (never raw HTML), so nothing in a description can run.
import { Fragment } from "react";

const INLINE = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+)/g;

function inline(text: string) {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <i key={i}>{part.slice(1, -1)}</i>;
    const md = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    const url = md?.[2] ?? (/^https?:\/\//.test(part) ? part : null);
    if (url)
      return (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer nofollow">
          {md?.[1] ?? part}
        </a>
      );
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Note({ text, className }: { text: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length)
      blocks.push(
        <ul key={blocks.length}>
          {list.map((l, i) => (
            <li key={i}>{inline(l)}</li>
          ))}
        </ul>,
      );
    list = [];
  };
  for (const line of text.split("\n")) {
    const item = line.match(/^\s*[-*]\s+(.*)$/);
    if (item) list.push(item[1]);
    else {
      flush();
      if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className={className}>{blocks}</div>;
}
