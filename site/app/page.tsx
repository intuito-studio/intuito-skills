import Link from 'next/link';
import { Command } from '@/components/command';
import { allSkills, installCommand, skillsByDomain } from '@/lib/skills';

const HomePage = () => {
  const groups = skillsByDomain();
  const total = allSkills().length;

  return (
    <div className="wrap layout">
      <aside className="side">
        <div className="eyebrow">Domains</div>
        <ul className="side-nav">
          {groups.map(({ domain, skills }) => (
            <li key={domain.id}>
              <a href={`#${domain.id}`}>
                <span>{domain.label}</span>
                <span className="count">{skills.length}</span>
              </a>
            </li>
          ))}
        </ul>
        <dl className="facts">
          <dt>Skills</dt>
          <dd>{total}</dd>
          <dt>Format</dt>
          <dd><a href="https://agentskills.io" target="_blank" rel="noopener noreferrer">Agent Skills</a></dd>
          <dt>Licence</dt>
          <dd>MIT</dd>
        </dl>
      </aside>

      <div className="content">
        <section className="intro">
          <h1>Agent skills we wrote for our own work, free to install.</h1>
          <p>
            Each skill is a plain <code>SKILL.md</code> folder that teaches an agent one job. They install into Claude Code,
            Codex, Cursor and other agents that read skills. Every skill page shows a real example and a before and
            after, so you can decide before you install.
          </p>
          <div className="eyebrow intro-label">Install all of them</div>
          <Command lines={[installCommand()]} />
        </section>

        {groups.map(({ domain, skills }) => (
          <section key={domain.id} id={domain.id} className="group">
            <header className="group-head">
              <h2>{domain.label}</h2>
              <p>{domain.blurb}</p>
            </header>
            <ul className="rows">
              {skills.map((s) => (
                <li key={s.name}>
                  <Link className="row" href={`/skills/${s.name}/`}>
                    <span className="row-name">{s.name}</span>
                    <span className="row-sum">{s.summary}</span>
                    <span className="row-go" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
