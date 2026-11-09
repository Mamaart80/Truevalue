import React, { useState } from 'react';
import { X, Sparkles, ChevronRight } from 'lucide-react';

interface WaltPromoBannerProps {
  onLearnMore: () => void;
}

export const WaltPromoBanner: React.FC<WaltPromoBannerProps> = ({ onLearnMore }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative mb-5 bg-gradient-to-r from-[#0088CC] via-[#29B6F6] to-[#4FC3F7] rounded-3xl p-4 sm:p-5 text-white overflow-hidden shadow-sm">
      
      {/* Background glowing geometric shapes */}
      <div className="absolute right-[-10px] top-[-10px] w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-90 hidden sm:block">
        {/* Abstract 3D card deck illustration like Walt */}
        <div className="relative w-24 h-24">
          <div className="absolute right-0 top-0 w-16 h-20 bg-white/30 backdrop-blur-md rounded-2xl rotate-12 border border-white/40 shadow-lg" />
          <div className="absolute right-4 top-2 w-16 h-20 bg-white/40 backdrop-blur-md rounded-2xl rotate-6 border border-white/50 shadow-md" />
          <div className="absolute right-8 top-4 w-16 h-20 bg-white/60 backdrop-blur-md rounded-2xl rotate-0 border border-white/60 shadow-xl flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-[#0088CC]" />
          </div>
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-3.5 top-3.5 h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/90 cursor-pointer transition-colors"
        title="Masquer"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Content */}
      <div className="relative z-10 max-w-[260px] sm:max-w-xs">
        <h3 className="text-base sm:text-lg font-extrabold leading-snug">
          Bienvenue sur MoneyWay.
        </h3>
        <p className="text-xs text-white/90 font-medium mt-0.5 leading-relaxed">
          Analyse statistique des volumes Betfair & détection Smart Money.
        </p>

        <button
          onClick={onLearnMore}
          className="inline-flex items-center gap-1 text-xs font-bold text-white hover:text-white/80 mt-2 cursor-pointer group"
        >
          <span>Découvrir les signaux</span>
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Carousel indicator dots */}
        <div className="flex items-center gap-1.5 mt-3">
          <span className="h-1.5 w-5 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        </div>
      </div>

    </div>
  );
};
