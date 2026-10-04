import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

export type LegalSection = { id: string; title: string; body: ReactNode };

type Props = {
  crumb: string;
  pill: string;
  title: string;
  titleAccent: string;
  updated: string;
  effective?: string;
  intro: ReactNode;
  sections: LegalSection[];
};

export const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export function XList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="legal-x-list">
      {items.map((item, i) => (
        <li key={i}>
          <span className="legal-x"><XIcon /></span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="legal-check-list">
      {items.map((item, i) => (
        <li key={i}>
          <span className="legal-check"><CheckIcon /></span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LegalPage({
  crumb, pill, title, titleAccent, updated, effective, intro, sections,
}: Props) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-35% 0px -60% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [sections]);

  return (
    <section className="legal">
      <div className="legal-bg" />

      <div className="legal-inner">
        <header className="legal-head">
          <nav className="legal-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            <span>{crumb}</span>
          </nav>

          <span className="legal-pill">{pill}</span>
          <h1 className="legal-title">
            {title} <span>{titleAccent}</span>
          </h1>

          <div className="legal-dates">
            <span><b>Last Updated:</b> {updated}</span>
            {effective && <span><b>Effective Date:</b> {effective}</span>}
          </div>

          <div className="legal-intro">{intro}</div>
        </header>

        <div className="legal-layout">
          <aside className="legal-toc">
            <p className="legal-toc-title">On this page</p>
            <ul>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={active === s.id ? "active" : ""}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <div className="legal-content">
            {sections.map((s) => (
              <article key={s.id} id={s.id} className="legal-block">
                <h2>{s.title}</h2>
                {s.body}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
