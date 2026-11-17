import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Trophy,
  CheckCircle2,
  AlertCircle,
  XOctagon,
} from 'lucide-react';
import { DEFAULT_QUESTIONS } from './data/defaultQuestions';
import {
  AnswerSlot,
  AutoSwitchRule,
  GameState,
  PlayMode,
  SoundConfig,
  SubmissionFeedback,
  SurveyQuestion,
} from './types/game';
import { matchPlayerAnswer } from './utils/matcher';
import {
  DEFAULT_SOUND_CONFIG,
  playCorrectSound,
  playRoundWinSound,
  playStrikeSound,
  playTurnSwitchSound,
} from './utils/sound';
import { AnswerBoard } from './components/AnswerBoard';
import { StrikeOverlay } from './components/StrikeOverlay';
import { QuestionManagerModal } from './components/QuestionManagerModal';
import { SetupModal } from './components/SetupModal';

const STORAGE_QUESTIONS_KEY = 'survey_showdown_questions_v1';
const STORAGE_SOUND_KEY = 'kkl100_sound_config_v1';
const STORAGE_AUTOSWITCH_KEY = 'kkl100_autoswitch_v1';

function loadSavedSoundConfig(): SoundConfig {
  try {
    const raw = localStorage.getItem(STORAGE_SOUND_KEY);
    if (raw) {
      return { ...DEFAULT_SOUND_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_SOUND_CONFIG;
}

function loadSavedAutoSwitch(): AutoSwitchRule {
  try {
    const raw = localStorage.getItem(STORAGE_AUTOSWITCH_KEY);
    if (raw === 'OFF' || raw === 'EVERY_WRONG' || raw === 'THREE_STRIKES') {
      return raw;
    }
  } catch {
    // Ignore storage errors
  }
  return 'OFF';
}

function loadSavedQuestions(): SurveyQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_QUESTIONS_KEY);
    if (!raw) return DEFAULT_QUESTIONS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore storage errors and fall back to default pack
  }
  return DEFAULT_QUESTIONS;
}

export default function App() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>(loadSavedQuestions);
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>('PLAYING');

  // Scoring & Teams
  const [playMode, setPlayMode] = useState<PlayMode>('TWO_TEAMS');
  const [teamAName, setTeamAName] = useState<string>('Team Alpha');
  const [teamBName, setTeamBName] = useState<string>('Team Omega');
  const [teamAScore, setTeamAScore] = useState<number>(0);
  const [teamBScore, setTeamBScore] = useState<number>(0);
  const [activeTeam, setActiveTeam] = useState<'A' | 'B'>('A');
  const [autoSwitchRule, setAutoSwitchRule] = useState<AutoSwitchRule>(loadSavedAutoSwitch);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [freePlayTotalScore, setFreePlayTotalScore] = useState<number>(0);

  // Round Board State
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [revealedAwards, setRevealedAwards] = useState<
    Record<string, { recipient: 'A' | 'B' | 'FREE'; points: number }>
  >({});
  const [lastRevealedId, setLastRevealedId] = useState<string | null>(null);

  // Per-Team Strikes & Big X Overlay
  const [teamAStrikes, setTeamAStrikes] = useState<number>(0);
  const [teamBStrikes, setTeamBStrikes] = useState<number>(0);
  const [freePlayStrikes, setFreePlayStrikes] = useState<number>(0);
  const [maxStrikes, setMaxStrikes] = useState<number>(3);
  const [showStrikeOverlay, setShowStrikeOverlay] = useState<boolean>(false);
  const [overlayStrikeCount, setOverlayStrikeCount] = useState<number>(1);
  const [overlayTeamName, setOverlayTeamName] = useState<string | undefined>(undefined);
  const [lastWrongGuess, setLastWrongGuess] = useState<string | undefined>(undefined);
  const strikeTimerRef = useRef<number | null>(null);

  // Player Input & Feedback
  const [guessInput, setGuessInput] = useState<string>('');
  const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio, Fullscreen & Modals
  const [soundConfig, setSoundConfig] = useState<SoundConfig>(loadSavedSoundConfig);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDeckOpen, setIsDeckOpen] = useState<boolean>(false);
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);

  const currentQuestion = questions[currentRoundIdx] || questions[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(questions));
    } catch {
      // Ignore storage quota errors
    }
  }, [questions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SOUND_KEY, JSON.stringify(soundConfig));
    } catch {
      // Ignore storage quota errors
    }
  }, [soundConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_AUTOSWITCH_KEY, autoSwitchRule);
    } catch {
      // Ignore storage quota errors
    }
  }, [autoSwitchRule]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const dismissStrikeOverlay = useCallback(() => {
    if (strikeTimerRef.current) {
      window.clearTimeout(strikeTimerRef.current);
      strikeTimerRef.current = null;
    }
    setShowStrikeOverlay(false);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, []);

  const activeTeamName =
    playMode === 'TWO_TEAMS'
      ? activeTeam === 'A'
        ? teamAName
        : teamBName
      : undefined;

  const handleSelectTeam = useCallback(
    (team: 'A' | 'B') => {
      if (activeTeam !== team) {
        playTurnSwitchSound(soundConfig);
        setActiveTeam(team);
      }
    },
    [activeTeam, soundConfig]
  );

  const triggerBigX = useCallback(
    (wrongWord?: string) => {
      playStrikeSound(soundConfig);

      const currentTeamStrikes =
        playMode === 'FREE_PLAY'
          ? freePlayStrikes
          : activeTeam === 'A'
          ? teamAStrikes
          : teamBStrikes;

      const nextStrike =
        maxStrikes === 3 ? (currentTeamStrikes >= 3 ? 1 : currentTeamStrikes + 1) : 1;

      if (playMode === 'FREE_PLAY') {
        setFreePlayStrikes(nextStrike);
      } else if (activeTeam === 'A') {
        setTeamAStrikes(nextStrike);
      } else {
        setTeamBStrikes(nextStrike);
      }

      setOverlayStrikeCount(nextStrike);
      setOverlayTeamName(activeTeamName);
      setLastWrongGuess(wrongWord);
      setShowStrikeOverlay(true);

      const shouldAutoSwitch =
        playMode === 'TWO_TEAMS' &&
        (autoSwitchRule === 'EVERY_WRONG' ||
          (autoSwitchRule === 'THREE_STRIKES' && nextStrike === 3));

      const nextTeam: 'A' | 'B' = activeTeam === 'A' ? 'B' : 'A';
      if (shouldAutoSwitch) {
        setActiveTeam(nextTeam);
      }

      if (strikeTimerRef.current) {
        window.clearTimeout(strikeTimerRef.current);
      }
      strikeTimerRef.current = window.setTimeout(() => {
        setShowStrikeOverlay(false);
        strikeTimerRef.current = null;
        if (shouldAutoSwitch) {
          playTurnSwitchSound(soundConfig);
        }
        inputRef.current?.focus();
      }, 1450);

      const teamPrefix = activeTeamName ? `${activeTeamName} · ` : '';
      const otherTeamName = activeTeam === 'A' ? teamBName : teamAName;
      let suffix = '';
      if (shouldAutoSwitch) {
        suffix = ` Turn switched to ${otherTeamName}.`;
      } else if (maxStrikes === 3 && nextStrike === 3 && playMode === 'TWO_TEAMS') {
        suffix = ` Three strikes — click ${otherTeamName} to switch turn!`;
      }

      setFeedback({
        type: 'wrong',
        message: wrongWord
          ? `${teamPrefix}"${wrongWord}" is not on the board.${suffix}`
          : `${teamPrefix}Strike ${nextStrike} recorded.${suffix}`,
      });
    },
    [
      activeTeam,
      activeTeamName,
      autoSwitchRule,
      freePlayStrikes,
      maxStrikes,
      playMode,
      soundConfig,
      teamAStrikes,
      teamBName,
      teamBStrikes,
    ]
  );

  const revealSlot = useCallback(
    (slot: AnswerSlot, awardPoints: boolean = true) => {
      if (revealedIds.has(slot.id)) return;
      playCorrectSound(soundConfig);

      const nextSet = new Set(revealedIds);
      nextSet.add(slot.id);
      setRevealedIds(nextSet);
      setLastRevealedId(slot.id);

      const pts = slot.points * multiplier;
      if (awardPoints) {
        const recipient: 'A' | 'B' | 'FREE' =
          playMode === 'FREE_PLAY' ? 'FREE' : activeTeam;

        if (recipient === 'FREE') {
          setFreePlayTotalScore((prev) => prev + pts);
        } else if (recipient === 'A') {
          setTeamAScore((prev) => prev + pts);
        } else {
          setTeamBScore((prev) => prev + pts);
        }

        setRevealedAwards((prev) => ({
          ...prev,
          [slot.id]: { recipient, points: pts },
        }));
      }

      if (nextSet.size === currentQuestion.answers.length) {
        setTimeout(() => playRoundWinSound(soundConfig), 280);
      }
    },
    [activeTeam, currentQuestion.answers.length, multiplier, playMode, revealedIds, soundConfig]
  );

  const handleManualSlotToggle = (slot: AnswerSlot) => {
    if (revealedIds.has(slot.id)) {
      const nextSet = new Set(revealedIds);
      nextSet.delete(slot.id);
      setRevealedIds(nextSet);

      const award = revealedAwards[slot.id];
      if (award) {
        if (award.recipient === 'FREE') {
          setFreePlayTotalScore((prev) => Math.max(0, prev - award.points));
        } else if (award.recipient === 'A') {
          setTeamAScore((prev) => Math.max(0, prev - award.points));
        } else {
          setTeamBScore((prev) => Math.max(0, prev - award.points));
        }
        setRevealedAwards((prev) => {
          const copy = { ...prev };
          delete copy[slot.id];
          return copy;
        });
      }

      if (lastRevealedId === slot.id) setLastRevealedId(null);
    } else {
      const pts = slot.points * multiplier;
      revealSlot(slot, true);
      const targetLabel = activeTeamName ? ` to ${activeTeamName}` : '';
      setFeedback({
        type: 'correct',
        message: `Revealed "${slot.text}" (+${pts} pts${targetLabel}).`,
        matchedText: slot.text,
        pointsAwarded: pts,
      });
    }
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guessInput.trim();
    if (!trimmed) return;

    const result = matchPlayerAnswer(trimmed, currentQuestion.answers, revealedIds);

    if (result.matched && result.slot) {
      if (result.alreadyRevealed) {
        setFeedback({
          type: 'duplicate',
          message: `"${result.slot.text}" is already revealed on the board.`,
        });
      } else {
        const pts = result.slot.points * multiplier;
        revealSlot(result.slot, true);
        const targetLabel = activeTeamName ? ` for ${activeTeamName}` : '';
        setFeedback({
          type: 'correct',
          message: `Correct! "${result.slot.text}" scores +${pts} points${targetLabel}.`,
          matchedText: result.slot.text,
          pointsAwarded: pts,
        });
      }
    } else {
      triggerBigX(trimmed);
    }

    setGuessInput('');
  };

  const handleRevealRemaining = () => {
    const nextSet = new Set(revealedIds);
    currentQuestion.answers.forEach((a) => nextSet.add(a.id));
    setRevealedIds(nextSet);
    setLastRevealedId(null);
    playRoundWinSound(soundConfig);
    setFeedback({
      type: 'info',
      message: 'All remaining survey answers revealed.',
    });
  };

  const resetRoundBoard = useCallback((roundIndex: number) => {
    setCurrentRoundIdx(roundIndex);
    setRevealedIds(new Set());
    setRevealedAwards({});
    setLastRevealedId(null);
    setTeamAStrikes(0);
    setTeamBStrikes(0);
    setFreePlayStrikes(0);
    setGuessInput('');
    setFeedback(null);
    setGameState('PLAYING');
    setTimeout(() => inputRef.current?.focus(), 40);
  }, []);

  const handleClearStrikes = () => {
    if (playMode === 'FREE_PLAY') {
      setFreePlayStrikes(0);
    } else if (activeTeam === 'A' && teamAStrikes > 0) {
      setTeamAStrikes(0);
    } else if (activeTeam === 'B' && teamBStrikes > 0) {
      setTeamBStrikes(0);
    } else {
      setTeamAStrikes(0);
      setTeamBStrikes(0);
    }
  };

  const handleNewMatch = () => {
    setTeamAScore(0);
    setTeamBScore(0);
    setFreePlayTotalScore(0);
    setActiveTeam('A');
    resetRoundBoard(0);
  };

  // Keyboard shortcuts for live stage hosting when not typing in an input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showStrikeOverlay) dismissStrikeOverlay();
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || isDeckOpen || isSetupOpen) {
        return;
      }

      if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        triggerBigX();
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 8) {
        const slot = currentQuestion.answers[num - 1];
        if (slot && !revealedIds.has(slot.id)) {
          revealSlot(slot, true);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentQuestion.answers,
    dismissStrikeOverlay,
    isDeckOpen,
    isSetupOpen,
    revealSlot,
    revealedIds,
    showStrikeOverlay,
    triggerBigX,
  ]);

  const allRevealed = revealedIds.size === currentQuestion.answers.length;

  return (
    <div className="min-h-screen flex flex-col bg-[#081226] text-slate-50">
      {/* Three-Zone Top Bar */}
      <header className="w-full border-b border-[#1A2F5A] bg-[#09152E]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setGameState('PLAYING')}
            className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white uppercase whitespace-nowrap shrink-0 cursor-pointer"
          >
            KKL 100
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="flex items-center gap-5 sm:gap-7 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => setIsDeckOpen(true)}
              className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Question Deck
            </button>
            <button
              type="button"
              onClick={() => setIsSetupOpen(true)}
              className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Event Settings
            </button>
            <button
              type="button"
              onClick={() =>
                setSoundConfig((prev) => ({ ...prev, muted: !prev.muted }))
              }
              aria-label={soundConfig.muted ? 'Unmute sound effects' : 'Mute sound effects'}
              className="inline-flex items-center gap-1.5 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {soundConfig.muted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {soundConfig.muted ? 'Muted' : 'Sound On'}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="hidden md:inline-flex items-center gap-1.5 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
              <span>{isFullscreen ? 'Exit Stage' : 'Stage View'}</span>
            </button>
          </nav>

          {/* Zone 3: Single primary action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleNewMatch}
              className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 text-xs sm:text-sm font-semibold hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Match
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {gameState === 'GAME_OVER' ? (
          <section className="my-auto rounded-2xl bg-[#0D1B38] border border-[#243F75] p-8 sm:p-12 text-center max-w-2xl mx-auto w-full space-y-8 shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-300 uppercase tracking-widest">
                Final Event Standings
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white uppercase text-balance">
                {playMode === 'FREE_PLAY'
                  ? `Final Score: ${freePlayTotalScore} Points`
                  : teamAScore === teamBScore
                  ? 'Match Tied!'
                  : `${teamAScore > teamBScore ? teamAName : teamBName} Wins!`}
              </h1>
            </div>

            {playMode === 'TWO_TEAMS' && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div
                  className={`p-5 rounded-xl border ${
                    teamAScore >= teamBScore
                      ? 'bg-[#152B56] border-amber-400'
                      : 'bg-[#0A1630] border-[#203869]'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-300">{teamAName}</p>
                  <p className="font-mono-num text-4xl font-bold text-amber-400 mt-1">
                    {teamAScore}
                  </p>
                </div>
                <div
                  className={`p-5 rounded-xl border ${
                    teamBScore >= teamAScore
                      ? 'bg-[#152B56] border-amber-400'
                      : 'bg-[#0A1630] border-[#203869]'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-300">{teamBName}</p>
                  <p className="font-mono-num text-4xl font-bold text-amber-400 mt-1">
                    {teamBScore}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleNewMatch}
                className="px-6 py-3 rounded-xl bg-amber-400 text-slate-950 font-semibold text-sm hover:bg-amber-300 transition-colors cursor-pointer"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => setGameState('PLAYING')}
                className="px-6 py-3 rounded-xl bg-[#152B56] text-white font-medium text-sm border border-[#2C4D8C] hover:bg-[#1D3970] transition-colors cursor-pointer"
              >
                Return to Board
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Scoreboard Row (Per-Team Score & 3x Strikes) */}
            <section
              aria-label="Scoreboard"
              className={
                playMode === 'TWO_TEAMS'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch'
                  : 'grid grid-cols-1 gap-4 items-stretch'
              }
            >
              {/* Team A (in Two-Team mode) OR Total Event Score (in Free Play) */}
              {playMode === 'TWO_TEAMS' ? (
                <div
                  onClick={() => handleSelectTeam('A')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelectTeam('A');
                  }}
                  className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-colors cursor-pointer ${
                    activeTeam === 'A'
                      ? 'bg-[#11244B] border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.14)]'
                      : 'bg-[#0C1936] border-[#203869] hover:border-[#34589E]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold text-white truncate">
                      {teamAName}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        activeTeam === 'A' ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      {activeTeam === 'A' ? 'Active Turn' : 'Click for Turn'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3 mt-3">
                    <span className="font-mono-num text-4xl sm:text-5xl font-bold text-white">
                      {teamAScore}
                    </span>
                    <div
                      className="flex items-center gap-1.5"
                      aria-label={`${teamAName} strikes: ${teamAStrikes} of ${maxStrikes}`}
                    >
                      {Array.from({ length: maxStrikes }, (_, i) => {
                        const active = i < teamAStrikes;
                        return (
                          <div
                            key={i}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center border text-base font-display font-bold transition-colors ${
                              active
                                ? 'bg-red-600 border-red-400 text-white'
                                : 'bg-[#081226] border-[#243F75] text-slate-600'
                            }`}
                          >
                            X
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#0C1936] border border-[#203869]">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-200">
                      Total Event Score
                    </span>
                    <span className="text-xs text-slate-400">All Rounds</span>
                  </div>
                  <div className="flex items-end justify-between gap-3 mt-3">
                    <span className="font-mono-num text-4xl sm:text-5xl font-bold text-white">
                      {freePlayTotalScore}
                    </span>
                    <div
                      className="flex items-center gap-1.5"
                      aria-label={`Strikes: ${freePlayStrikes} of ${maxStrikes}`}
                    >
                      {Array.from({ length: maxStrikes }, (_, i) => {
                        const active = i < freePlayStrikes;
                        return (
                          <div
                            key={i}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center border text-base font-display font-bold transition-colors ${
                              active
                                ? 'bg-red-600 border-red-400 text-white'
                                : 'bg-[#081226] border-[#243F75] text-slate-600'
                            }`}
                          >
                            X
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Team B (in Two-Team mode) */}
              {playMode === 'TWO_TEAMS' && (
                <div
                  onClick={() => handleSelectTeam('B')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelectTeam('B');
                  }}
                  className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-colors cursor-pointer ${
                    activeTeam === 'B'
                      ? 'bg-[#11244B] border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.14)]'
                      : 'bg-[#0C1936] border-[#203869] hover:border-[#34589E]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold text-white truncate">
                      {teamBName}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        activeTeam === 'B' ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      {activeTeam === 'B' ? 'Active Turn' : 'Click for Turn'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3 mt-3">
                    <span className="font-mono-num text-4xl sm:text-5xl font-bold text-white">
                      {teamBScore}
                    </span>
                    <div
                      className="flex items-center gap-1.5"
                      aria-label={`${teamBName} strikes: ${teamBStrikes} of ${maxStrikes}`}
                    >
                      {Array.from({ length: maxStrikes }, (_, i) => {
                        const active = i < teamBStrikes;
                        return (
                          <div
                            key={i}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center border text-base font-display font-bold transition-colors ${
                              active
                                ? 'bg-red-600 border-red-400 text-white'
                                : 'bg-[#081226] border-[#243F75] text-slate-600'
                            }`}
                          >
                            X
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Survey Question Prompt */}
            <section className="rounded-2xl bg-[#0D1B38] border border-[#243F75] px-6 py-5 sm:px-8 sm:py-6 text-center space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-slate-400">
                <span className="font-mono-num font-semibold text-amber-300">
                  Round {currentRoundIdx + 1} of {questions.length}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentQuestion.category}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {revealedIds.size} of {currentQuestion.answers.length} revealed
                </span>
                {multiplier > 1 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num font-semibold text-amber-300">
                      {multiplier}x Points
                    </span>
                  </>
                )}
              </div>
              <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-wide text-white text-balance max-w-3xl mx-auto leading-tight">
                {currentQuestion.prompt}
              </h1>
            </section>

            {/* Survey Answer Board */}
            <AnswerBoard
              answers={currentQuestion.answers}
              revealedIds={revealedIds}
              lastRevealedId={lastRevealedId}
              multiplier={multiplier}
              onManualToggle={handleManualSlotToggle}
            />

            {/* Player Answer Input Bar */}
            <section className="space-y-3">
              <form
                onSubmit={handleGuessSubmit}
                className="flex flex-col sm:flex-row gap-3 items-stretch"
              >
                <div className="flex-1">
                  <label htmlFor="player-answer-input" className="sr-only">
                    Enter your survey answer
                  </label>
                  <input
                    id="player-answer-input"
                    ref={inputRef}
                    type="text"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    placeholder="Type a player's answer and press Enter..."
                    autoComplete="off"
                    className="w-full h-13 px-5 rounded-xl bg-[#0D1B38] border border-[#2C4D8C] text-base sm:text-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="h-13 px-7 rounded-xl bg-amber-400 text-slate-950 font-semibold text-base hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Submit Answer
                </button>
              </form>

              {/* Submission Feedback Line */}
              <div className="min-h-6 flex items-center justify-between gap-4 px-1">
                {feedback ? (
                  <div
                    className={`inline-flex items-center gap-2 text-sm font-medium ${
                      feedback.type === 'correct'
                        ? 'text-emerald-400'
                        : feedback.type === 'wrong'
                        ? 'text-red-400'
                        : feedback.type === 'duplicate'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {feedback.type === 'correct' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {feedback.type === 'wrong' && <XOctagon className="w-4 h-4 shrink-0" />}
                    {(feedback.type === 'duplicate' || feedback.type === 'info') && (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-400">
                    {activeTeamName
                      ? `Answering for ${activeTeamName} · Type an answer above or click any numbered tile to award points.`
                      : 'Type an answer above, or click any numbered tile to reveal it manually for live mic contestants.'}
                  </p>
                )}
              </div>
            </section>

            {/* Host & Round Controls Bar */}
            <section
              aria-label="Host Controls"
              className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1A2F5A]"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => triggerBigX()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <XOctagon className="w-4 h-4" />
                  Wrong Answer (X)
                </button>

                <button
                  type="button"
                  onClick={handleClearStrikes}
                  disabled={teamAStrikes === 0 && teamBStrikes === 0 && freePlayStrikes === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#112349] hover:bg-[#193366] text-slate-200 text-sm font-medium border border-[#243F75] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Strikes
                </button>

                <button
                  type="button"
                  onClick={handleRevealRemaining}
                  disabled={allRevealed}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#112349] hover:bg-[#193366] text-slate-200 text-sm font-medium border border-[#243F75] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  Reveal Remaining
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => resetRoundBoard(Math.max(0, currentRoundIdx - 1))}
                  disabled={currentRoundIdx === 0}
                  className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-[#112349] hover:bg-[#193366] text-slate-200 text-sm font-medium border border-[#243F75] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>

                {currentRoundIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => resetRoundBoard(currentRoundIdx + 1)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1A356B] hover:bg-amber-400 hover:text-slate-950 text-white text-sm font-semibold border border-[#32579C] transition-colors cursor-pointer"
                  >
                    Next Round
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setGameState('GAME_OVER')}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    Finish Event
                  </button>
                )}

                {currentRoundIdx < questions.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setGameState('GAME_OVER')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#112349] hover:bg-[#193366] text-slate-200 text-sm font-medium border border-[#243F75] transition-colors cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    Standings
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Big Red X Strike Overlay */}
      <StrikeOverlay
        visible={showStrikeOverlay}
        strikeCount={overlayStrikeCount}
        teamName={overlayTeamName}
        wrongGuess={lastWrongGuess}
        onDismiss={dismissStrikeOverlay}
      />

      {/* Question Deck & Editor Modal */}
      <QuestionManagerModal
        isOpen={isDeckOpen}
        questions={questions}
        currentQuestionIndex={currentRoundIdx}
        onClose={() => setIsDeckOpen(false)}
        onSelectRound={(idx) => resetRoundBoard(idx)}
        onSaveQuestions={(updated) => {
          setQuestions(updated);
          if (currentRoundIdx >= updated.length) {
            resetRoundBoard(Math.max(0, updated.length - 1));
          } else {
            resetRoundBoard(currentRoundIdx);
          }
        }}
        onResetDefaults={() => {
          setQuestions(DEFAULT_QUESTIONS);
          resetRoundBoard(0);
        }}
      />

      {/* Event Settings Modal */}
      <SetupModal
        isOpen={isSetupOpen}
        playMode={playMode}
        teamAName={teamAName}
        teamBName={teamBName}
        multiplier={multiplier}
        maxStrikes={maxStrikes}
        autoSwitchRule={autoSwitchRule}
        soundConfig={soundConfig}
        onClose={() => setIsSetupOpen(false)}
        onChangePlayMode={setPlayMode}
        onChangeTeamNames={(a, b) => {
          setTeamAName(a || 'Team Alpha');
          setTeamBName(b || 'Team Omega');
        }}
        onChangeMultiplier={setMultiplier}
        onChangeMaxStrikes={(s) => {
          setMaxStrikes(s);
          setTeamAStrikes(0);
          setTeamBStrikes(0);
          setFreePlayStrikes(0);
        }}
        onChangeAutoSwitchRule={setAutoSwitchRule}
        onChangeSoundConfig={setSoundConfig}
        onResetMatchScores={handleNewMatch}
      />
    </div>
  );
}
