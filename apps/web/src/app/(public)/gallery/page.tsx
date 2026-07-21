import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Event photos and memories from 7 NOTES.',
};

export default function GalleryPage() {
  return (
    <div className="page-container py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white">Gallery</h1>
        <p className="mt-4 text-text-secondary">Event photos coming soon.</p>
      </div>
    </div>
  );
}
