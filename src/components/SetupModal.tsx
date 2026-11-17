import React from 'react';
import { Play, Volume2, VolumeX, X } from 'lucide-react';
import { AutoSwitchRule, PlayMode, SoundConfig, SoundTheme } from '../types/game';
import {
  playCorrectSound,
  playRoundWinSound,
  playStrikeSound,
  playTurnSwitchSound,
} from '../utils/sound';

interface SetupModalProps {
  isOpen: boolean;
  playMode: PlayMode;
  teamAName: string;
  teamBName: string;
  multiplier: number;
  maxStrikes: number;
  autoSwitchRule: AutoSwitchRule;
  soundConfig: SoundConfig;
  onClose: () => void;
  onChangePlayMode: (mode: PlayMode) => void;
  onChangeTeamNames: (teamA: string, teamB: string) => void;
  onChangeMultiplier: (mult: number) => void;
  onChangeMaxStrikes: (strikes: number) => void;
  onChangeAutoSwitchRule: (rule: AutoSwitchRule) => void;
  onChangeSoundConfig: (next: SoundConfig) => void;
  onResetMatchScores: () => void;
}

const SOUND_THEMES: { id: SoundTheme; label: string }[] = [
  { id: 'STUDIO', label: 'TV Studio' },
  { id: 'FAMILY_100', label: 'Family 100' },
  { id: 'ARCADE', label: 'Arcade' },
  { id: 'ARENA', label: 'Arena Organ' },
  { id: 'MINIMAL', label: 'Minimal' },
];

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  playMode,
  teamAName,
  teamBName,
  multiplier,
  maxStrikes,
  autoSwitchRule,
  soundConfig,
  onClose,
  onChangePlayMode,
  onChangeTeamNames,
  onChangeMultiplier,
  onChangeMaxStrikes,
  onChangeAutoSwitchRule,
  onChangeSoundConfig,
  onResetMatchScores,
}) => {
  if (!isOpen) return null;

  const updateSound = (patch: Partial<SoundConfig>) => {
    onChangeSoundConfig({ ...soundConfig, ...patch });
  };

  const previewConfig: SoundConfig = { ...soundConfig, muted: false };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0D1B38] border border-[#28457E] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#203869] shrink-0">
          <h2 className="font-display text-2xl font-bold tracking-wide text-white uppercase">
            Event Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close event settings"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#172C59] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Play Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Scoring Format
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#081226] rounded-xl border border-[#203869]">
              <button
                type="button"
                onClick={() => onChangePlayMode('TWO_TEAMS')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  playMode === 'TWO_TEAMS'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Two Teams
              </button>
              <button
                type="button"
                onClick={() => onChangePlayMode('FREE_PLAY')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  playMode === 'FREE_PLAY'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Single / Audience
              </button>
            </div>
          </div>

          {/* Team Names & Auto Switch */}
          {playMode === 'TWO_TEAMS' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Team 1 Name
                  </label>
                  <input
                    type="text"
                    value={teamAName}
                    onChange={(e) => onChangeTeamNames(e.target.value, teamBName)}
                    maxLength={22}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#081226] border border-[#2C4D8C] text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Team 2 Name
                  </label>
                  <input
                    type="text"
                    value={teamBName}
                    onChange={(e) => onChangeTeamNames(teamAName, e.target.value)}
                    maxLength={22}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#081226] border border-[#2C4D8C] text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Turn Switching on Wrong Answer
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-[#081226] rounded-xl border border-[#203869]">
                  <button
                    type="button"
                    onClick={() => onChangeAutoSwitchRule('OFF')}
                    className={`py-2 px-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      autoSwitchRule === 'OFF'
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Manual Click
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeAutoSwitchRule('EVERY_WRONG')}
                    className={`py-2 px-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      autoSwitchRule === 'EVERY_WRONG'
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Auto Every Wrong
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeAutoSwitchRule('THREE_STRIKES')}
                    className={`py-2 px-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      autoSwitchRule === 'THREE_STRIKES'
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Auto After 3 Strikes
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Round Multiplier & Strike Rule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Round Point Multiplier
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#081226] rounded-xl border border-[#203869]">
                {[1, 2, 3].map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => onChangeMultiplier(mult)}
                    className={`py-2 rounded-lg text-xs sm:text-sm font-mono-num font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      multiplier === mult
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Wrong Answer Strike Rule
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#081226] rounded-xl border border-[#203869]">
                <button
                  type="button"
                  onClick={() => onChangeMaxStrikes(3)}
                  className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    maxStrikes === 3
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  3 Strikes
                </button>
                <button
                  type="button"
                  onClick={() => onChangeMaxStrikes(1)}
                  className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    maxStrikes === 1
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Single Big X
                </button>
              </div>
            </div>
          </div>

          {/* Sound & Audio Configuration */}
          <div className="pt-4 border-t border-[#203869] space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Sound &amp; Audio Effects
                </h3>
                <p className="text-xs text-slate-400">
                  Choose a sound pack, adjust stage volume, and test cues
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateSound({ muted: !soundConfig.muted })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                  soundConfig.muted
                    ? 'bg-[#081226] border-[#2C4D8C] text-slate-300 hover:text-white'
                    : 'bg-amber-400 border-amber-300 text-slate-950'
                }`}
              >
                {soundConfig.muted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>{soundConfig.muted ? 'Audio Muted' : 'Audio Active'}</span>
              </button>
            </div>

            {/* Master Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <label htmlFor="sound-volume-slider">Master Volume</label>
                <span className="font-mono-num font-semibold text-amber-300">
                  {Math.round(soundConfig.volume * 100)}%
                </span>
              </div>
              <input
                id="sound-volume-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(soundConfig.volume * 100)}
                onChange={(e) =>
                  updateSound({
                    volume: Number(e.target.value) / 100,
                    muted: Number(e.target.value) === 0 ? true : soundConfig.muted,
                  })
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Sound Theme */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Sound Pack Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-[#081226] rounded-xl border border-[#203869]">
                {SOUND_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      const next = { ...soundConfig, theme: theme.id };
                      onChangeSoundConfig(next);
                      playCorrectSound({ ...next, muted: false });
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      soundConfig.theme === theme.id
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Sound Cue Toggles & Test Triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#081226] border border-[#203869]">
                <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundConfig.enableCorrect}
                    onChange={(e) => updateSound({ enableCorrect: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                  <span>Correct Answer Chime</span>
                </label>
                <button
                  type="button"
                  onClick={() => playCorrectSound({ ...previewConfig, enableCorrect: true })}
                  aria-label="Test correct answer chime"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#152B56] hover:bg-amber-400 hover:text-slate-950 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  Test
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#081226] border border-[#203869]">
                <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundConfig.enableStrike}
                    onChange={(e) => updateSound({ enableStrike: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                  <span>Wrong Buzzer (X)</span>
                </label>
                <button
                  type="button"
                  onClick={() => playStrikeSound({ ...previewConfig, enableStrike: true })}
                  aria-label="Test wrong answer buzzer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#152B56] hover:bg-red-500 hover:text-white text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  Test
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#081226] border border-[#203869]">
                <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundConfig.enableFanfare}
                    onChange={(e) => updateSound({ enableFanfare: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                  <span>Round Complete Fanfare</span>
                </label>
                <button
                  type="button"
                  onClick={() => playRoundWinSound({ ...previewConfig, enableFanfare: true })}
                  aria-label="Test round complete fanfare"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#152B56] hover:bg-amber-400 hover:text-slate-950 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  Test
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#081226] border border-[#203869]">
                <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundConfig.enableTurnSwitch}
                    onChange={(e) => updateSound({ enableTurnSwitch: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                  <span>Turn Switch Cue</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    playTurnSwitchSound({ ...previewConfig, enableTurnSwitch: true })
                  }
                  aria-label="Test turn switch cue"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#152B56] hover:bg-amber-400 hover:text-slate-950 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  Test
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-[#203869]">
            <button
              type="button"
              onClick={() => {
                onResetMatchScores();
                onClose();
              }}
              className="text-sm font-medium text-red-400 hover:text-red-300 cursor-pointer"
            >
              Reset All Match Scores
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-amber-400 text-slate-950 text-sm font-semibold hover:bg-amber-300 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
