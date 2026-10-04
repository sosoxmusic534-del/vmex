import { useState, type ReactNode } from "react";

type Social = { type: "website" | "discord" | "telegram" | "email"; url: string };

type Member = {
  name: string;
  role: string;
  quote: string;
  avatar: string;
  socials: Social[];
  featured?: boolean;
};

const team: Member[] = [
  {
    name: "Thikshana",
    role: "Co-Founder",
    quote: "Driving VMEX's mission to deliver fast, stable connectivity for every Sri Lankan user.",
    avatar: "/team/thikshana.png",
    socials: [{ type: "discord", url: "https://discord.gg/9WEcTQ9cvM" }],
  },
  {
    name: "Sikka",
    role: "Founder & CEO",
    quote: "Building rock-solid V2Ray infrastructure with low latency and zero compromises.",
    avatar: "/team/sikka.png",
    socials: [
      { type: "discord", url: "https://discord.gg/9WEcTQ9cvM" },
    ],
    featured: true,
  },
  {
    name: "Dithira",
    role: "Network Engineer",
    quote: "Every route we optimize brings our users a faster, more secure internet.",
    avatar: "/team/dithira.png",
    socials: [{ type: "telegram", url: "https://t.me/vmexv2ray" }],
    },
];

const icons: Record<Social["type"], ReactNode> = {
  website: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  discord: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  telegram: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  email: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6l-10 7L2 6" />
    </>
  ),
};

function Avatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="team-avatar">
      {failed ? (
        <span className="team-initials">{initials}</span>
      ) : (
        <img src={src} alt={name} onError={() => setFailed(true)} />
      )}
    </div>
  );
}

export default function Team() {
  return (
    <section className="team" id="team">
      <div className="team-lines" />
      <div className="team-glow" />

      <div className="team-inner">
        <p className="section-eyebrow">OUR TEAM</p>
        <h2 className="section-title">
          The Visionaries Behind <span>VMEX</span>
        </h2>

        <div className="team-grid">
          {team.map((m) => (
            <article key={m.name} className={`team-card ${m.featured ? "featured" : ""}`}>
              <Avatar src={m.avatar} name={m.name} />

              <h3 className="team-name">{m.name}</h3>
              <p className="team-role">{m.role}</p>
              <p className="team-quote">"{m.quote}"</p>

              <div className="team-socials">
                {m.socials.map((s) => (
                  <a
                    key={s.type}
                    href={s.url}
                    className="team-social"
                    aria-label={s.type}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {icons[s.type]}
                    </svg>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}