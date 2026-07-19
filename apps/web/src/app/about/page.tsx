import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Jamming — the platform connecting musicians for live sessions in Austin.',
};

const VALUES = [
  {
    icon: '🤝',
    title: 'Community First',
    desc: 'We believe music brings people together. Every feature is designed to strengthen the local music community.',
  },
  {
    icon: '🎨',
    title: 'Made for Musicians',
    desc: 'Built by musicians, for musicians. We understand what you need because we are you.',
  },
  {
    icon: '✨',
    title: 'Simple & Beautiful',
    desc: 'No clutter, no complexity. Just a clean experience that gets out of your way and lets the music speak.',
  },
  {
    icon: '🔒',
    title: 'Trust & Safety',
    desc: 'Every ticket is verified, every check-in is recorded, and your data is protected.',
  },
];

export default function AboutPage() {
  return (
    <div className="page-container py-16">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <span className="text-3xl">🎵</span>
        </div>
        <h1 className="text-4xl font-bold text-white">About Jamming</h1>
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">
          Jamming is Austin&apos;s community-driven platform for live music sessions. We connect musicians
          with the spaces, events, and audiences that make this city the live music capital of the world.
        </p>
      </div>

      {/* Story */}
      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-2xl font-bold text-white">Our Story</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            Jamming started in a small recording studio in East Austin. A group of musicians were
            frustrated with how hard it was to find jam sessions, book venues, and manage tickets.
            Spreadsheets, social media posts, and group chats were the norm — and it was a mess.
          </p>
          <p>
            So we built what we wished existed: a single platform where organizers could create events,
            musicians could discover and book them, and everyone could focus on what matters — making music.
          </p>
          <p>
            Today, Jamming powers dozens of sessions every month across Austin. From intimate acoustic
            nights at coffee shops to full-blown blues jams at legendary clubs, we&apos;re helping
            keep Austin&apos;s live music scene thriving.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-white text-center">What We Believe</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-[var(--color-border)] bg-surface p-6 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
                <span className="text-xl">{value.icon}</span>
              </div>
              <h3 className="mt-4 font-semibold text-white">{value.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-white">Ready to join the community?</h2>
        <p className="mt-2 text-text-secondary">Whether you&apos;re a musician or an organizer, there&apos;s a place for you.</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            href="/auth/register"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5"
          >
            Get started
          </Link>
          <Link
            href="/events"
            className="rounded-lg border border-[var(--color-border)] px-6 py-3 font-medium text-text-secondary transition-all hover:bg-surface-hover"
          >
            Browse events
          </Link>
        </div>
      </section>
    </div>
  );
}
