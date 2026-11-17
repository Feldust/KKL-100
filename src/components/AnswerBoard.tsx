import React from 'react';
import { AnswerSlot } from '../types/game';

interface AnswerBoardProps {
  answers: AnswerSlot[];
  revealedIds: Set<string>;
  lastRevealedId: string | null;
  multiplier: number;
  onManualToggle: (slot: AnswerSlot) => void;
}

export const AnswerBoard: React.FC<AnswerBoardProps> = ({
  answers,
  revealedIds,
  lastRevealedId,
  multiplier,
  onManualToggle,
}) => {
  const splitIndex = Math.ceil(answers.length / 2);
  const leftColumn = answers.slice(0, splitIndex);
  const rightColumn = answers.slice(splitIndex);

  const renderSlot = (slot: AnswerSlot, indexNumber: number) => {
    const isRevealed = revealedIds.has(slot.id);
    const isNewest = lastRevealedId === slot.id;
    const displayPoints = slot.points * multiplier;

    return (
      <button
        key={slot.id}
        type="button"
        onClick={() => onManualToggle(slot)}
        aria-label={
          isRevealed
            ? `Answer ${indexNumber}: ${slot.text}, ${displayPoints} points`
            : `Hidden answer slot ${indexNumber}. Click to reveal.`
        }
        className="tile-perspective group w-full h-16 sm:h-[76px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl cursor-pointer"
      >
        <div className={`tile-inner ${isRevealed ? 'is-revealed' : ''}`}>
          {/* Front (Hidden Numbered Slot) */}
          <div className="tile-face flex items-center justify-center rounded-xl bg-gradient-to-b from-[#163063] to-[#0E2044] border border-[#2C4D8C] group-hover:border-amber-400/70 transition-colors shadow-inner px-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-[#09152E] border border-[#32579C] group-hover:border-amber-400/80 transition-colors">
              <span className="font-display text-2xl sm:text-3xl font-bold text-amber-300 tabular-nums">
                {indexNumber}
              </span>
            </div>
          </div>

          {/* Back (Revealed Answer & Points) */}
          <div
            className={`tile-face tile-face-back flex items-stretch overflow-hidden rounded-xl border transition-colors ${
              isNewest
                ? 'bg-gradient-to-b from-[#1B3B78] to-[#122957] border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.28)]'
                : 'bg-gradient-to-b from-[#153166] to-[#0F234B] border-[#3860AA]'
            }`}
          >
            <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 min-w-0">
              <span className="font-display text-sm sm:text-base font-semibold text-amber-300/70 tabular-nums shrink-0">
                {indexNumber}.
              </span>
              <span className="font-display text-lg sm:text-2xl font-bold tracking-wide text-white uppercase truncate">
                {slot.text}
              </span>
            </div>
            <div className="flex items-center justify-center w-16 sm:w-20 bg-[#0A1733] border-l border-[#2C4D8C] shrink-0">
              <span className="font-mono-num text-xl sm:text-2xl font-bold text-amber-400">
                {displayPoints}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="w-full rounded-2xl bg-[#0B1936] border border-[#243F75] p-3 sm:p-5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="flex flex-col gap-3">
          {leftColumn.map((slot, i) => renderSlot(slot, i + 1))}
        </div>
        <div className="flex flex-col gap-3">
          {rightColumn.map((slot, i) => renderSlot(slot, splitIndex + i + 1))}
        </div>
      </div>
    </div>
  );
};
