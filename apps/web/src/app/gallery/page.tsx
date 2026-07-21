import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Photos and memories from past 7 NOTES events.',
};

export default function GalleryPage() {
  return (
    <div className="page-container py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-white">Gallery</h1>
        <p className="mt-2 text-text-secondary">
          Photos from past 7 NOTES events will appear here.
        </p>
        <div className="mt-8">
          <Link
            href="/events"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover"
          >
            Browse upcoming events
          </Link>
        </div>
      </div>
    </div>
  );
}
