'use client';

import { useState, useCallback, useEffect } from 'react';
import { getProofImageUrl } from '@/lib/api-client';

interface ScreenshotViewerProps {
  proofId?: string | null;
  mimeType?: string | null;
  googleDriveViewUrl?: string | null;
  loading?: boolean;
}

export function ScreenshotViewer({
  proofId,
  loading,
}: ScreenshotViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);

  const imageUrl = proofId ? getProofImageUrl(proofId) : null;

  // Reset all interactive state when proofId changes (stale-state protection)
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setImageError(false);
  }, [proofId]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((r) => (r - 90) % 360);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const handleRetry = useCallback(() => {
    setImageError(false);
  }, []);

  // Keyboard support
  useEffect(() => {
    if (!isFullscreen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          setIsFullscreen(false);
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotateRight();
          break;
        case 'R':
          handleRotateLeft();
          break;
        case '0':
          handleResetZoom();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleZoomIn, handleZoomOut, handleRotateLeft, handleRotateRight, handleResetZoom]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-surface p-4">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Screenshot</p>
        <div className="aspect-video animate-pulse rounded-md bg-surface-elevated" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-surface p-4">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Screenshot</p>
        <div className="flex aspect-video items-center justify-center rounded-md bg-surface-elevated">
          <p className="text-sm text-text-muted">No screenshot available</p>
        </div>
      </div>
    );
  }

  const previewContent = (
    <div className="relative flex items-center justify-center overflow-hidden rounded-md bg-surface-elevated min-h-[120px]">
      {imageError ? (
        <div className="flex h-full w-full flex-col items-center justify-center py-8">
          <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          <p className="mt-1 text-xs text-text-muted">Failed to load screenshot</p>
          <button
            onClick={handleRetry}
            className="mt-2 rounded-md bg-surface-elevated border border-[var(--color-border)] px-3 py-1 text-2xs text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt="Payment screenshot"
          className="mx-auto object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            maxHeight: isFullscreen ? '80vh' : '200px',
          }}
          onError={() => setImageError(true)}
        />
      )}
    </div>
  );

  return (
    <>
      <div className="rounded-lg border border-[var(--color-border)] bg-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-text-muted uppercase tracking-wider">Screenshot</p>
          <div className="flex items-center gap-1">
            {/* Zoom out */}
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="rounded p-1 text-text-muted hover:text-white hover:bg-surface-hover disabled:opacity-30 transition-colors"
              title="Zoom out"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <span className="text-2xs text-text-muted w-8 text-center">{Math.round(zoom * 100)}%</span>
            {/* Zoom in */}
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="rounded p-1 text-text-muted hover:text-white hover:bg-surface-hover disabled:opacity-30 transition-colors"
              title="Zoom in"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            {/* Rotate left */}
            <button
              onClick={handleRotateLeft}
              className="rounded p-1 text-text-muted hover:text-white hover:bg-surface-hover transition-colors"
              title="Rotate left (Shift+R)"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            </button>
            {/* Rotate right */}
            <button
              onClick={handleRotateRight}
              className="rounded p-1 text-text-muted hover:text-white hover:bg-surface-hover transition-colors"
              title="Rotate right (R)"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0115 0m0 0l-3-3m3 3l-3-3m-12 0a7.5 7.5 0 0115 0m0 0l3-3m-3 3l3-3" />
              </svg>
            </button>
            {/* Reset */}
            <button
              onClick={handleResetZoom}
              className="rounded p-1 text-text-muted hover:text-white hover:bg-surface-hover transition-colors"
              title="Reset zoom (0)"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            </button>
            {/* Fullscreen */}
            <button
              onClick={() => { setIsFullscreen(true); }}
              className="rounded p-1 text-text-muted hover:text-white hover:bg-surface-hover transition-colors"
              title="Fullscreen (Esc to close)"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-md border border-[var(--color-border)] overflow-hidden">
          {previewContent}
        </div>
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/80 text-white hover:bg-surface transition-colors backdrop-blur-sm"
              title="Close (Esc)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {imageError ? (
              <div className="flex flex-col items-center justify-center bg-surface-elevated p-12 rounded-lg">
                <p className="text-text-muted mb-2">Failed to load screenshot</p>
                <button
                  onClick={handleRetry}
                  className="rounded-md bg-surface-elevated border border-[var(--color-border)] px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt="Payment screenshot (fullscreen)"
                className="mx-auto object-contain rounded-lg"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  maxHeight: '85vh',
                }}
                onError={() => setImageError(true)}
              />
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-surface/90 backdrop-blur-sm px-3 py-1.5 border border-[var(--color-border)]">
              <button onClick={handleZoomOut} disabled={zoom <= 0.5} className="rounded p-1 text-text-muted hover:text-white disabled:opacity-30">−</button>
              <span className="text-xs text-text-muted w-8 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} disabled={zoom >= 3} className="rounded p-1 text-text-muted hover:text-white disabled:opacity-30">+</button>
              <button onClick={handleRotateLeft} className="rounded p-1 text-text-muted hover:text-white" title="Rotate left">↺</button>
              <button onClick={handleRotateRight} className="rounded p-1 text-text-muted hover:text-white" title="Rotate right">↻</button>
              <button onClick={handleResetZoom} className="rounded p-1 text-text-muted hover:text-white text-xs ml-1">Reset</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
