import React from 'react';

interface StrikeOverlayProps {
  visible: boolean;
  strikeCount: number; // 1, 2, or 3
  teamName?: string;
  wrongGuess?: string;
  onDismiss: () => void;
}

export const StrikeOverlay: React.FC<StrikeOverlayProps> = ({
  visible,
  strikeCount,
  teamName,
  wrongGuess,
  onDismiss,
}) => {
  if (!visible) return null;

  const count = Math.max(1, Math.min(3, strikeCount));
  const items = Array.from({ length: count }, (_, idx) => idx);

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs px-4 cursor-pointer select-none"
    >
      <div className="animate-strike-slam flex flex-col items-center gap-6">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {items.map((idx) => (
            <div
              key={idx}
              className="flex items-center justify-center w-28 h-32 sm:w-44 sm:h-48 rounded-2xl bg-red-600 border-4 border-red-300 shadow-[0_20px_60px_rgba(220,38,38,0.65)]"
            >
              <svg
                viewBox="0 0 100 100"
                className="w-20 h-20 sm:w-32 sm:h-32 text-white drop-shadow-md"
                aria-hidden="true"
              >
                <path
                  d="M 20 20 L 80 80 M 80 20 L 20 80"
                  stroke="currentColor"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ))}
        </div>

        <div className="text-center space-y-1">
          {teamName && (
            <p className="text-sm sm:text-base font-semibold uppercase tracking-widest text-red-300">
              {teamName}
            </p>
          )}
          <p className="font-display text-3xl sm:text-5xl font-bold tracking-wider text-white uppercase">
            {count === 3 ? 'Three Strikes' : count === 2 ? 'Strike Two' : 'Strike'}
          </p>
          {wrongGuess ? (
            <p className="text-sm sm:text-base text-red-200 font-medium">
              &ldquo;{wrongGuess}&rdquo; is not on the board
            </p>
          ) : (
            <p className="text-sm text-red-200 font-medium">
              Answer not found on the survey board
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
