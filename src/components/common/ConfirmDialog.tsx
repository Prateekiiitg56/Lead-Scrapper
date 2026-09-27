import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Destructive-action confirmation. Focus starts on Cancel so Enter never deletes by accident. */
export function ConfirmDialog({ open, title, children, confirmLabel, busy, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useDialog(ref, open, () => {
    if (!busy) onCancel();
  });

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in" onClick={busy ? undefined : onCancel} aria-hidden="true" />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative bg-white rounded-[24px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-[#d1d5db] text-[#14161A] animate-blur-fade-up"
      >
        <div className="flex items-center gap-3 text-red-700">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Trash2 className="w-5 h-5" />
          </div>
          <h2 id={titleId} className="text-[16px] font-bold">{title}</h2>
        </div>
        <div id={descId} className="text-[13px] text-[#374151] font-medium leading-relaxed">{children}</div>
        {error && (
          <p role="alert" className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-medium">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" data-autofocus onClick={onCancel} disabled={busy} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="btn-danger">
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
