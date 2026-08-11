import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';

export interface WelcomeService {
  title: string;
  description: string;
  image: string;
  overlayImage: string;
  /** If set, clicking this card opens this URL in a new tab instead of navigating in-app. */
  href?: string;
}

const DEFAULT_SERVICES: WelcomeService[] = [
  {
    title: 'Lead Generation',
    description: 'Find businesses, scrape contacts, and launch outreach campaigns.',
    image: '/lead-gen-card.png',
    overlayImage: 'https://framerusercontent.com/images/R8KAWJ8XJ7xyTu7ucAu7MwYY.png?scale-down-to=512',
  },
  {
    title: 'Reel Analyzer',
    description: 'Analyze Instagram Reels for engagement, trends, and insights.',
    image: '/reel-analyzer-card.png',
    overlayImage: 'https://framerusercontent.com/images/lXJpgpSzhcdgjAHyzQ8gL6xZio.png?scale-down-to=512',
    href: 'https://ig-scrapper-chi.vercel.app/',
  },
];

export interface WelcomeServicesModalProps {
  open: boolean;
  userName?: string;
  onClose: () => void;
  onSelect: (service: WelcomeService) => void;
  services?: WelcomeService[];
}

export function WelcomeServicesModal({
  open,
  userName,
  onClose,
  onSelect,
  services = DEFAULT_SERVICES,
}: WelcomeServicesModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Lock body scroll & listen for Escape
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus the dialog on open
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Handle card selection: show checkmark briefly, then fire callback & close
  const handleCardClick = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      const service = services[index];
      setTimeout(() => {
        // If the service has an external URL, open it in a new tab
        if (service.href) {
          window.open(service.href, '_blank', 'noopener,noreferrer');
          onClose();
        } else {
          onSelect(service);
        }
        setSelectedIndex(null);
      }, 400);
    },
    [services, onSelect, onClose]
  );

  if (!open) return null;

  const displayName = userName?.split(' ')[0] || userName;
  const headingId = 'welcome-modal-heading';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
      {/* ── Dimmed Backdrop ── */}
      <div
        className="fixed inset-0 bg-[#14161A]/60 backdrop-blur-sm z-[9999] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Centered Modal Panel ── */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="relative z-[10000] bg-white rounded-[24px] border border-[#E2E8F0] shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-6 sm:p-8 text-[#14161A] font-sans outline-none animate-blur-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Close Button ── */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#8A90A2] hover:text-[#14161A] hover:bg-[#F4F5F8] transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Header ── */}
        <div className="text-center mb-8 sm:mb-10">
          <h2
            id={headingId}
            ref={headingRef}
            className="text-[28px] sm:text-[36px] font-bold text-[#14161A] tracking-tight leading-tight"
          >
            {displayName ? (
              <>Welcome, {displayName}</>
            ) : (
              <>Welcome</>
            )}
          </h2>
          <p className="text-[15px] sm:text-[16px] text-[#6B7280] font-light mt-2">
            What can I help you with today?
          </p>
        </div>

        {/* ── Services Grid (2 cards side by side) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {services.map((service, index) => {
            const isSelected = selectedIndex === index;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleCardClick(index)}
                className={`group relative bg-[#F8F9FC] rounded-2xl p-5 flex flex-col h-[240px] sm:h-[250px] transition-all duration-200 hover:bg-[#F0F1F5] cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-[#F0501E]/40 focus-visible:ring-offset-2
                  ${isSelected ? 'ring-2 ring-[#F0501E] bg-[#FDEDE7]/30 scale-[0.98]' : 'hover:shadow-md'}`}
              >
                {/* ── Selection Checkmark ── */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#F0501E] text-white flex items-center justify-center shadow-md animate-fade-in z-10">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                {/* ── Image Stack ── */}
                <div className="relative flex-grow flex items-center justify-center mb-3">
                  {/* Back Image */}
                  <img
                    src={service.image}
                    alt={`${service.title} showcase`}
                    className="absolute w-32 sm:w-36 h-auto rounded-lg shadow-md transform -rotate-6 transition-all duration-300 ease-out group-hover:rotate-[-10deg] group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://placehold.co/512x512/e2e8f0/4a5568?text=Image+1';
                    }}
                  />
                  {/* Front Image */}
                  <img
                    src={service.overlayImage}
                    alt={`${service.title} example`}
                    className="absolute w-32 sm:w-36 h-auto rounded-lg shadow-lg transform rotate-3 transition-all duration-300 ease-out group-hover:rotate-[5deg] group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://placehold.co/512x512/cbd5e0/2d3748?text=Image+2';
                    }}
                  />
                </div>

                {/* ── Service Title & Description ── */}
                <div className="mt-auto">
                  <h3 className="text-left text-[14px] font-semibold text-[#14161A]">
                    {service.title}
                    {service.href && (
                      <span className="ml-1.5 text-[10px] font-medium text-[#8A90A2] align-middle">↗</span>
                    )}
                  </h3>
                  <p className="text-left text-[12px] text-[#6B7280] mt-1 leading-snug">
                    {service.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Skip Link ── */}
        <div className="text-center mt-6 sm:mt-8">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-[#8A90A2] hover:text-[#4B5264] transition-colors cursor-pointer font-medium"
          >
            I'll decide later
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
