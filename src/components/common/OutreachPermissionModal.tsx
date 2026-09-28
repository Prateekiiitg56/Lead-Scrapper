import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Mail, X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';

interface OutreachPermissionModalProps {
  open: boolean;
  onClose: () => void;
}

export function OutreachPermissionModal({ open, onClose }: OutreachPermissionModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(ref, open, onClose);

  if (!open) return null;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans text-[#14161A]">
      <div className="fixed inset-0 bg-black/65 backdrop-blur-xs animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-white rounded-[28px] p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl border border-[#d1d5db] animate-blur-fade-up"
      >
        <button type="button" onClick={onClose} className="btn-icon absolute top-5 right-5" aria-label="Close dialog">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-[#17192B] text-[#F0501E] flex items-center justify-center flex-shrink-0 shadow-md" aria-hidden="true">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="eyebrow text-[#C2410C] font-bold">Admin restriction</div>
            <h2 id={titleId} className="text-xl font-bold text-[#14161A]">Outreach permission required</h2>
          </div>
        </div>

        <p className="text-[13px] text-[#374151] font-medium leading-relaxed bg-[#f8f9fc] p-4 rounded-[18px] border border-[#d1d5db]">
          Sending WhatsApp messages incurs Meta API costs (<strong>₹0.80 per message</strong>). Message dispatch is
          restricted to authorized admin accounts. Email outreach is open to everyone and goes out from your own Gmail.
        </p>

        {adminEmail && (
          <div className="space-y-2 text-[12px]">
            <div className="flex items-center gap-2 text-[#374151] font-bold">
              <Mail className="w-4 h-4 text-[#F0501E]" aria-hidden="true" />
              <span>Ask the administrator for access:</span>
            </div>
            <a
              href={`mailto:${adminEmail}`}
              className="block bg-[#17192B] text-white p-3 rounded-xl font-mono text-[12px] font-bold truncate hover:bg-[#23263d]"
            >
              {adminEmail}
            </a>
          </div>
        )}

        <div className="pt-2 border-t border-[#e2e8f0]">
          <button type="button" onClick={onClose} className="w-full btn-dark">
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
