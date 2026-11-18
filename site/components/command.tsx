import { CopyButton } from './copy-button';

export const Command = ({ lines, prompt = '$' }: { lines: string[]; prompt?: string }) => (
  <div className="cmd">
    {lines.map((line) => (
      <div className="cmd-row" key={line}>
        <code tabIndex={0}>
          {prompt ? <span className="cmd-prompt">{prompt} </span> : null}
          {line}
        </code>
        <CopyButton text={line} />
      </div>
    ))}
  </div>
);
