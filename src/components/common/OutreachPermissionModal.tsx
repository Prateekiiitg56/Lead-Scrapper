import { Lock, Mail, X } from 'lucide-react';

interface OutreachPermissionModalProps {
  userEmail?: string | null;
  onClose: () => void;
}

export function OutreachPermissionModal({
  onClose,
}: OutreachPermissionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in font-sans text-[#14161A]">
      <div className="bg-white rounded-[28px] p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl border border-[#d1d5db] relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#6B7280] hover:text-[#14161A] p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#17192B] text-[#F0501E] flex items-center justify-center flex-shrink-0 shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="eyebrow text-[#F0501E] font-bold">ADMIN RESTRICTION</div>
            <h3 className="text-xl font-bold font-sans text-[#14161A]">Outreach Permission Required</h3>
          </div>
        </div>

        {/* Informational Message */}
        <p className="text-[13px] text-[#374151] font-medium leading-relaxed bg-[#f8f9fc] p-4 rounded-[18px] border border-[#d1d5db]">
          Sending WhatsApp messages incurs Meta API costs (<strong>₹0.80 per message</strong>). Message dispatch is restricted to authorized admin accounts only.
        </p>

        {/* Admin Contact Info */}
        <div className="space-y-2 text-[12px]">
          <div className="flex items-center gap-2 text-[#374151] font-bold">
            <Mail className="w-4 h-4 text-[#F0501E]" />
            <span>Administrator Contact:</span>
          </div>
          <div className="bg-[#17192B] text-white p-3 rounded-xl font-mono text-[12px] font-bold flex items-center justify-between">
            <span className="truncate">{import.meta.env.VITE_ADMIN_EMAIL || 'admin@lead-scrapper.ai'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Owner</span>
          </div>
        </div>

        {/* Dismiss CTA */}
        <div className="pt-2 border-t border-[#e2e8f0] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#17192B] hover:bg-[#17192B]/90 text-white font-bold text-[12px] transition-all shadow-xs cursor-pointer text-center"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
