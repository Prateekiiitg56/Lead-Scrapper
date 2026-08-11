import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface OutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  businessName: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function OutreachModal({
  isOpen,
  onClose,
  icon,
  title,
  businessName,
  children,
  footer,
}: OutreachModalProps) {
  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
      {/* ── Dimmed Full-Screen Viewport Backdrop ── */}
      <div
        className="fixed inset-0 bg-[#14161A]/50 backdrop-blur-xs transition-opacity animate-fade-in z-[9999]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Fixed Width Centered Card (440px on Desktop / 90vw on Mobile) ── */}
      <div
        className="relative z-[10000] bg-white rounded-[22px] border border-[#E2E8F0] shadow-2xl w-full max-w-[440px] max-h-[85vh] p-6 text-[#14161A] font-sans flex flex-col animate-blur-fade-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Single-Row Header ── */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#E2E8F0] mb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex-shrink-0">{icon}</div>
            <h3 className="text-[16px] font-bold text-[#14161A] truncate" title={`${title} — ${businessName}`}>
              {title} <span className="text-[#8A90A2] font-normal">—</span> {businessName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#8A90A2] hover:text-[#14161A] hover:bg-[#F4F5F8] transition-colors cursor-pointer flex-shrink-0"
            aria-label="Close Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Modal Body Content (Internal Vertical Scroll ONLY) ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-5 pr-0.5 scrollbar-thin">
          {children}
        </div>

        {/* ── Modal Footer Row (Right-Aligned Buttons) ── */}
        <div className="pt-4 border-t border-[#E2E8F0] mt-5 flex items-center justify-end gap-3 flex-shrink-0">
          {footer}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
