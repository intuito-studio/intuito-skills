import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Command } from '@/components/command';
import { Install } from '@/components/install';
import { allSkills, getSkill, installCommand, md, PLUGIN, REPO, type Sample } from '@/lib/skills';

type Props = { params: Promise<{ name: string }> };

export const dynamicParams = false;

export const generateStaticParams = () => allSkills().map((s) => ({ name: s.name }));

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const skill = getSkill((await params).name);
  if (!skill) return {};
  return {
    title: skill.name,
    description: skill.summary,
    alternates: { canonical: `/skills/${skill.name}/` },
    openGraph: {
      title: `${skill.name} · Intuito Skills`,
      description: skill.summary,
      url: `/skills/${skill.name}/`,
      type: 'article',
      siteName: 'Intuito Skills',
      images: [{ url: `/og/${skill.name}.png`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: [`/og/${skill.name}.png`] },
  };
};

const SampleCard = ({ kind, sample }: { kind: 'before' | 'after'; sample: Sample }) => (
  <div className="sample" data-kind={kind}>
    <div className="sample-head">
      <span className="eyebrow">{kind === 'before' ? 'Before' : 'After'}</span>
      <span className="sample-label">{sample.label}</span>
    </div>
    <div className="sample-body md" dangerouslySetInnerHTML={{ __html: md(sample.text) }} />
    {sample.note ? <p className="sample-note">{sample.note}</p> : null}
  </div>
);

const SkillPage = async ({ params }: Props) => {
  const skill = getSkill((await params).name);
  if (!skill) notFound();

  const { showcase } = skill;
  const hasCompare = Boolean(showcase?.before && showcase?.after);
  const toc = [
    { id: 'about', text: 'What it does' },
    ...(showcase?.demo ? [{ id: 'demo', text: 'Demo' }] : []),
    ...(hasCompare ? [{ id: 'before-after', text: 'Before and after' }] : []),
    { id: 'skill', text: 'The full skill' },
    ...skill.headings.map((h) => ({ ...h, sub: true })),
  ];

  return (
    <div className="wrap layout">
      <aside className="side">
        <div className="eyebrow">
          <Link href={`/#${skill.domain.id}`}>{skill.domain.label}</Link>
        </div>
        <h1 className="skill-name">{skill.name}</h1>

        <Install
          tabs={[
            { id: 'cli', label: 'Skills CLI', panel: <Command lines={[installCommand(skill.name)]} /> },
            {
              id: 'plugin',
              label: 'Claude Code',
              panel: (
                <>
                  <Command prompt="" lines={[`/plugin marketplace add ${REPO}`, `/plugin install ${PLUGIN}`]} />
                  <p className="hint">Installs every skill in the library as one plugin.</p>
                </>
              ),
            },
          ]}
        />

        <dl className="facts">
          <dt>Domain</dt>
          <dd>{skill.domain.label}</dd>
          <dt>Licence</dt>
          <dd>{skill.license}</dd>
          <dt>Length</dt>
          <dd>{skill.lines} lines</dd>
          <dt>Files</dt>
          <dd>{skill.files.length === 1 ? skill.files[0] : `${skill.files.length} files`}</dd>
          <dt>Source</dt>
          <dd>
            <a href={`https://github.com/${REPO}/tree/main/skills/${skill.name}`} target="_blank" rel="noopener noreferrer">GitHub</a>
          </dd>
        </dl>

        <nav className="toc" aria-label="On this page">
          <div className="eyebrow">On this page</div>
          <ul>
            {toc.map((t) => (
              <li key={t.id} data-sub={'sub' in t ? '' : undefined}>
                <a href={`#${t.id}`}>{t.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <article className="content">
        <section id="about" className="box">
          <div>
            <h2 className="eyebrow">What it does</h2>
            <p>{skill.what}</p>
          </div>
          {skill.when.length ? (
            <div>
              <h2 className="eyebrow">Use it when</h2>
              <ul className="when">
                {skill.when.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {showcase?.demo ? (
          <section id="demo" className="block">
            <h2 className="label">Demo</h2>
            <div className="demo">
              <div className="demo-step">
                <div className="eyebrow">You say</div>
                <blockquote>{showcase.demo.prompt}</blockquote>
              </div>
              <div className="demo-step">
                <div className="eyebrow">You get</div>
                <div className="md demo-result" dangerouslySetInnerHTML={{ __html: md(showcase.demo.result) }} />
              </div>
            </div>
            {showcase.demo.caption ? <p className="caption">{showcase.demo.caption}</p> : null}
          </section>
        ) : null}

        {hasCompare && showcase?.before && showcase.after ? (
          <section id="before-after" className="block">
            <h2 className="label">Before and after</h2>
            <div className="compare">
              <SampleCard kind="before" sample={showcase.before} />
              <SampleCard kind="after" sample={showcase.after} />
            </div>
            {showcase.method ? <p className="caption">{showcase.method}</p> : null}
          </section>
        ) : null}

        <section id="skill" className="block">
          <h2 className="label">The full skill</h2>
          <p className="caption">This is the text your agent reads. Nothing else is installed.</p>
          <div className="md skill-body" dangerouslySetInnerHTML={{ __html: skill.bodyHtml }} />
        </section>
      </article>
    </div>
  );
};

export default SkillPage;
