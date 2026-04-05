import { useEffect, useMemo, useRef, useState } from "react";
import { featuredProjects, profile, schedule } from "./data";
import { useElementWidth } from "./useElementWidth";
import { usePretextMetrics } from "./usePretextMetrics";
import { useAvailability } from "./useAvailability";
import { useProjects } from "./useProjects";

type PageId = "home" | "about" | "projects" | "schedule" | "contact";

const navItems: Array<{ id: PageId; label: string }> = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "schedule", label: "Schedule" },
  { id: "contact", label: "Contact" },
];

function getPageFromHash(): PageId {
  const hash = window.location.hash.replace("#", "").trim();
  if (navItems.some((item) => item.id === hash)) {
    return hash as PageId;
  }
  return "home";
}

function App() {
  const [page, setPage] = useState<PageId>(() => getPageFromHash());

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="site-header">
        <a className="brand" href="#home">
          Narendra
        </a>

        <nav className="nav-links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={page === item.id ? "is-active" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="topbar-links">
          <a href={profile.links.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={profile.links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </div>
      </header>

      <div className="page-shell">{renderPage(page)}</div>
    </main>
  );
}

function renderPage(page: PageId) {
  switch (page) {
    case "about":
      return <AboutPage />;
    case "projects":
      return <ProjectsPage />;
    case "schedule":
      return <SchedulePage />;
    case "contact":
      return <ContactPage />;
    case "home":
    default:
      return <HomePage />;
  }
}

function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroWidth = useElementWidth(heroRef);
  const heroMetrics = usePretextMetrics(profile.headline, Math.max(heroWidth - 40, 260), 60);

  return (
    <section className="page-view">
      <section className="hero-panel hero-full">
        <div className="hero-grid hero-grid-wide">
          <div className="hero-copy" ref={heroRef}>
            <p className="eyebrow">
              {profile.role} at {profile.company} • {profile.location}
            </p>
            <h1
              className={`hero-title hero-lines-${Math.min(heroMetrics.lineCount || 1, 4)}`}
            >
              {profile.headline}
            </h1>
            <p className="hero-intro">{profile.intro}</p>
            <div className="hero-actions">
              <a href="#projects" className="button button-solid">
                Explore Projects
              </a>
              <a href="#schedule" className="button button-ghost">
                See Availability
              </a>
            </div>
          </div>

          <aside className="hero-card">
            <span className="hero-card-label">Working Snapshot</span>
            <ul>
              <li>Building on Axelor with Java backend logic</li>
              <li>Shipping React components and XML-driven views</li>
              <li>Exploring AI automation and generative workflows</li>
              <li>Learning hosting, deployment, and better product rhythm</li>
            </ul>
            <div className="pretext-note">
              <span>Pretext-powered text rhythm</span>
              <strong>{heroMetrics.lineCount || 1} headline lines</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className="page-grid">
        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Quick Intro</p>
            <h2>Backend-focused product work with room for experimentation.</h2>
          </div>
          <p className="feature-copy">
            I work across Java backend systems, React interfaces, XML views, and emerging AI
            workflows. The goal is simple: build software that feels useful, flexible, and ready
            for real users.
          </p>
        </article>

        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Current Direction</p>
            <h2>Shipping products while learning faster in public.</h2>
          </div>
          <div className="tag-cloud">
            {profile.interests.map((interest) => (
              <span key={interest}>{interest}</span>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="page-view">
      <section className="panel page-panel">
        <div className="section-heading">
          <p className="eyebrow">About</p>
          <h2>Building products with backend depth and AI curiosity.</h2>
        </div>

        <div className="about-layout">
          <div className="about-copy">
            {profile.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <aside className="about-sidecard">
            <span className="hero-card-label">Profile Summary</span>
            <ul>
              <li>Role: {profile.role}</li>
              <li>Company: {profile.company}</li>
              <li>Location: {profile.location}</li>
              <li>Strengths: Java, React, Django, Flask, low-code product work</li>
            </ul>
          </aside>
        </div>
      </section>
    </section>
  );
}

function ProjectsPage() {
  const { projects, loading, error } = useProjects();

  return (
    <section className="page-view">
      <section className="panel page-panel">
        <div className="section-heading">
          <p className="eyebrow">Projects</p>
          <h2>All public GitHub projects, ordered by the most recent pushed commits first.</h2>
        </div>

        <div className="project-list wide-projects">
          {projects.map((project) => (
            <ProjectCard key={project.name} {...project} />
          ))}
        </div>

        <div className="schedule-actions">
          {loading && <p className="schedule-meta">Loading projects from GitHub…</p>}
          {!loading && !error && (
            <p className="schedule-meta">Projects are sorted by latest GitHub activity.</p>
          )}
          {error && <p className="schedule-meta schedule-error">{error}</p>}
        </div>
      </section>
    </section>
  );
}

function SchedulePage() {
  const { schedule: liveSchedule, upcomingBusy, freeBlocks, connected, liveLoaded, loading, error } =
    useAvailability();
  const showLiveState = connected && liveLoaded && !error;
  const cardsToRender = showLiveState ? liveSchedule : schedule;
  const heading = showLiveState
    ? "My working availability, based on office hours and connected calendar signals."
    : connected && error
      ? "Calendar is connected, but the latest live sync did not complete successfully."
      : "Connect your calendar to generate live busy and free windows for this page.";

  return (
    <section className="page-view">
      <section className="panel page-panel">
        <div className="section-heading">
          <p className="eyebrow">Schedule</p>
          <h2>{heading}</h2>
        </div>

        <div className="schedule-grid schedule-grid-wide">
          {cardsToRender.map((block) => (
            <div className="schedule-card" key={block.day}>
              <span>{block.day}</span>
              <strong>{block.window}</strong>
              <p>{block.focus}</p>
            </div>
          ))}
        </div>

        <div className="schedule-actions">
          {connected ? (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                void fetch("/api/sync", { method: "POST" }).then(() => window.location.reload());
              }}
            >
              Refresh availability
            </button>
          ) : (
            <a href="/auth/google" className="button button-solid">
              Connect Google Calendar
            </a>
          )}

          {loading && <p className="schedule-meta">Checking calendar connection…</p>}
          {!loading && showLiveState && (
            <p className="schedule-meta">Live availability is enabled and synced.</p>
          )}
          {!loading && connected && !showLiveState && !error && (
            <p className="schedule-meta">Calendar connected. Refresh to load live availability.</p>
          )}
          {error && <p className="schedule-meta schedule-error">{error}</p>}
        </div>

        {connected && showLiveState && (
          <div className="busy-panel">
            <div className="section-heading section-heading-compact">
              <p className="eyebrow">Live Schedule</p>
              <h2>Busy and free windows from your connected calendar.</h2>
            </div>

            <div className="live-grid">
              <div className="live-card">
                <span className="eyebrow">Busy Blocks</span>
                <div className="busy-list">
                  {upcomingBusy.length > 0 ? (
                    upcomingBusy.map((item) => (
                      <div className="busy-item" key={`${item.day}-${item.start}-${item.end}`}>
                        <span>{item.day}</span>
                        <strong>
                          {item.start} - {item.end}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="schedule-meta">No busy blocks detected in the current sync window.</p>
                  )}
                </div>
              </div>

              <div className="live-card">
                <span className="eyebrow">Free Blocks</span>
                <div className="busy-list">
                  {freeBlocks.length > 0 ? (
                    freeBlocks.map((item) => (
                      <div className="busy-item" key={`${item.day}-${item.start}-${item.end}`}>
                        <span>{item.day}</span>
                        <strong>
                          {item.start} - {item.end}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="schedule-meta">
                      No free blocks were derived inside your office hours window.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="schedule-meta">
              Best collaboration is picked from the longest available free block during your office
              hours. Meeting names stay hidden because the current permission only exposes
              free/busy timing.
            </p>
          </div>
        )}

        {connected && error && (
          <div className="busy-panel">
            <div className="section-heading section-heading-compact">
              <p className="eyebrow">Sync Status</p>
              <h2>The calendar connection is active, but live availability could not be refreshed.</h2>
            </div>
            <p className="schedule-meta">
              The page is currently showing your fallback schedule only. Use `Refresh availability`
              after checking the backend server and calendar connection.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

function ContactPage() {
  return (
    <section className="page-view">
      <section className="panel page-panel">
        <div className="section-heading">
          <p className="eyebrow">Contact</p>
          <h2>Open to conversations around products, backend systems, and AI-flavored ideas.</h2>
        </div>

        <p className="feature-copy">
          If you want to connect around product development, low-code platforms, backend systems,
          or AI experimentation, these are the best places to reach me.
        </p>

        <div className="contact-links">
          <a href={profile.links.github} target="_blank" rel="noreferrer" className="contact-link">
            GitHub
          </a>
          <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className="contact-link">
            LinkedIn
          </a>
        </div>
      </section>
    </section>
  );
}

type ProjectCardProps = (typeof featuredProjects)[number];

function ProjectCard({ name, summary, stack, status, link, accent }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(cardRef);
  const metrics = usePretextMetrics(summary, Math.max(width - 44, 260), 26);
  const meterWidth = useMemo(
    () => `${Math.min((metrics.lineCount || 1) * 24, 100)}%`,
    [metrics.lineCount],
  );

  return (
    <div className="project-card project-card-wide" ref={cardRef}>
      <div className="project-meta">
        <span>{accent}</span>
        <strong>{status}</strong>
      </div>
      <h3>{name}</h3>
      <p>{summary}</p>
      <div className="project-footer">
        <div className="stack-list">
          {stack.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <a href={link} target="_blank" rel="noreferrer">
          View repo
        </a>
      </div>
      <div className="project-meter" aria-hidden="true">
        <span style={{ width: meterWidth }} />
      </div>
    </div>
  );
}

export default App;
