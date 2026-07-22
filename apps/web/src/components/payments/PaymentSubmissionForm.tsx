'use client';

import { useState, useRef, useCallback } from 'react';

interface PaymentSubmissionFormProps {
  orderNumber: string;
  isResubmission?: boolean;
  previousRejectionReason?: string;
  onSubmit: (_data: { utrNumber: string; screenshot: File; note?: string }) => Promise<void>;
  onSuccess?: () => void;
}

type UploadState = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Invalid file type. Please upload a JPEG, PNG, or WebP image.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is 5 MB (yours is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`;
  }
  return null;
}

function validateUtr(utr: string): string | null {
  const trimmed = utr.trim();
  if (!trimmed) return 'UTR / Transaction reference is required.';
  if (trimmed.length < 6) return 'UTR seems too short. Please enter the full transaction reference.';
  if (trimmed.length > 50) return 'UTR is too long. Please check and re-enter.';
  return null;
}



export function PaymentSubmissionForm({
  orderNumber,
  isResubmission = false,
  previousRejectionReason,
  onSubmit,
  onSuccess,
}: PaymentSubmissionFormProps) {
  const [utrNumber, setUtrNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulated upload progress
  const simulateProgress = useCallback(() => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);
    return interval;
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validationError = validateFile(selected);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setFile(selected);
    setErrorMessage(null);
    setFieldErrors((prev) => ({ ...prev, screenshot: '' }));

    // Create preview
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
  }

  function handleRemoveFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function validateAll(): boolean {
    const errors: Record<string, string> = {};

    const utrError = validateUtr(utrNumber);
    if (utrError) errors.utrNumber = utrError;

    if (!file) errors.screenshot = 'Payment screenshot is required.';
    else {
      const fileError = validateFile(file);
      if (fileError) errors.screenshot = fileError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateAll()) return;

    setUploadState('validating');
    setErrorMessage(null);

    // Brief validation delay for UX
    await new Promise((r) => setTimeout(r, 500));

    setUploadState('uploading');
    const progressInterval = simulateProgress();

    try {
      await onSubmit({ utrNumber: utrNumber.trim(), screenshot: file!, note: note.trim() || undefined });
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadState('success');
      setTimeout(() => onSuccess?.(), 800);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadState('error');
      setErrorMessage(err.message || 'Upload failed. Please try again.');
    }
  }

  function handleRetry() {
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMessage(null);
  }

  function clearFieldError(field: string) {
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  }

  // Success screen
  if (uploadState === 'success') {
    return (
      <div className="rounded-xl border border-success/20 bg-success/5 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">
          {isResubmission ? 'Payment Resubmitted' : 'Payment Submitted'}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          {isResubmission
            ? 'Your updated payment proof has been received. Verification in progress.'
            : 'Your payment proof has been received. Verification in progress.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-surface-elevated px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {isResubmission ? 'Resubmit Payment Proof' : 'Submit Payment Proof'}
            </h3>
            <p className="text-xs text-text-secondary">
              {isResubmission
                ? 'Update your UTR and screenshot for verification'
                : 'Provide your payment details for verification'}
            </p>
          </div>
        </div>
      </div>

      {/* Previous rejection notice */}
      {isResubmission && previousRejectionReason && (
        <div className="mx-5 mt-4 rounded-lg bg-error/5 border border-error/10 px-4 py-3">
          <p className="text-xs font-medium text-error">Previous rejection reason</p>
          <p className="mt-0.5 text-xs text-text-secondary">{previousRejectionReason}</p>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Order reference */}
        <div className="rounded-lg bg-surface-elevated px-3 py-2">
          <p className="text-2xs text-text-muted">Order Reference</p>
          <p className="font-mono text-sm text-white">{orderNumber}</p>
        </div>

        {/* UTR Number */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            UTR / Transaction Reference <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={utrNumber}
            onChange={(e) => { setUtrNumber(e.target.value); clearFieldError('utrNumber'); }}
            placeholder="e.g. 412345678901"
            disabled={uploadState === 'uploading'}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-white bg-surface-elevated placeholder:text-text-muted font-mono focus:outline-none focus:ring-1 transition-colors ${
              fieldErrors.utrNumber
                ? 'border-error focus:border-error focus:ring-error'
                : 'border-[var(--color-border)] focus:border-primary focus:ring-primary'
            } disabled:opacity-50`}
          />
          {fieldErrors.utrNumber && <p className="mt-1 text-xs text-error">{fieldErrors.utrNumber}</p>}
          <p className="mt-1 text-2xs text-text-muted">
            This is the 12-digit reference number shown after your UPI payment
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Payment Screenshot <span className="text-error">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploadState === 'uploading'}
          />

          {!preview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === 'uploading'}
              className="w-full rounded-lg border-2 border-dashed border-[var(--color-border)] bg-surface-elevated p-8 text-center hover:border-primary/50 hover:bg-surface-elevated/80 transition-all disabled:opacity-50 group"
            >
              <svg className="mx-auto h-8 w-8 text-text-muted group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="mt-2 text-sm text-text-muted group-hover:text-white transition-colors">
                Click to upload screenshot
              </p>
              <p className="mt-1 text-2xs text-text-muted">
                JPEG, PNG, or WebP — Max 5 MB
              </p>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border border-[var(--color-border)] bg-surface-elevated">
                <img
                  src={preview}
                  alt="Payment screenshot preview"
                  className="mx-auto max-h-48 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={uploadState === 'uploading'}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/80 text-text-muted hover:bg-error/20 hover:text-error transition-colors backdrop-blur-sm disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {file && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-muted truncate">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadState === 'uploading'}
                    className="text-xs text-primary hover:text-primary-hover disabled:opacity-50"
                  >
                    Replace
                  </button>
                </div>
              )}
            </div>
          )}
          {fieldErrors.screenshot && <p className="mt-1 text-xs text-error">{fieldErrors.screenshot}</p>}
        </div>

        {/* Optional Note */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any additional information for the verifier..."
            rows={2}
            disabled={uploadState === 'uploading'}
            className="w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none disabled:opacity-50"
          />
        </div>

        {/* Progress bar */}
        {uploadState === 'uploading' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Uploading...</span>
              <span className="text-text-muted">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.min(uploadProgress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-lg bg-error/10 border border-error/20 px-4 py-3">
            <div className="flex items-start gap-2">
              <svg className="h-4 w-4 text-error flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-error">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Submit button */}
        {uploadState !== 'uploading' && (
          <button
            type="submit"
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover active:scale-[0.99]"
          >
            {isResubmission ? 'Resubmit Payment Proof' : 'Submit Payment Proof'}
          </button>
        )}

        {/* Retry */}
        {uploadState === 'error' && (
          <button
            type="button"
            onClick={handleRetry}
            className="w-full rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-medium text-white hover:bg-surface-hover transition-colors"
          >
            Try Again
          </button>
        )}

        <p className="text-xs text-text-muted text-center">
          Your proof will be verified manually. This usually takes 2–6 hours.
        </p>
      </div>
    </form>
  );
}
