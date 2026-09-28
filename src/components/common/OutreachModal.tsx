import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';

export interface OutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  businessName: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function OutreachModal({ isOpen, onClose, icon, title, businessName, children, footer }: OutreachModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(dialogRef, isOpen, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-[#14161A]/50 backdrop-blur-xs animate-fade-in" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-white rounded-t-[22px] sm:rounded-[22px] border border-[#E2E8F0] shadow-2xl w-full sm:max-w-[440px] max-h-[92dvh] sm:max-h-[85vh] p-5 sm:p-6 text-[#14161A] font-sans flex flex-col animate-blur-fade-up overflow-hidden outline-none"
      >
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#E2E8F0] mb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex-shrink-0" aria-hidden="true">{icon}</div>
            <h2 id={titleId} className="text-[16px] font-bold text-[#14161A] truncate" title={`${title} — ${businessName}`}>
              {title} <span className="text-[#6B7280] font-normal">—</span> {businessName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon flex-shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-5 pr-0.5">{children}</div>

        <div className="pt-4 border-t border-[#E2E8F0] mt-5 flex items-center justify-end gap-3 flex-shrink-0">{footer}</div>
      </div>
    </div>,
    document.body
  );
}
