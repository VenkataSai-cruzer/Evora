import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with 7 NOTES.',
};

export default function ContactPage() {
  return (
    <div className="page-container py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-white">Get in touch</h1>
        <p className="mt-4 text-text-secondary">Have a question or want to collaborate? We&apos;d love to hear from you.</p>
      </div>
      <div className="mx-auto mt-12 max-w-xl space-y-4">
        <p className="text-sm text-text-muted text-center">Email: hello@7notes.in</p>
      </div>
    </div>
  );
}
