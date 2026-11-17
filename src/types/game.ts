export interface AnswerSlot {
  id: string;
  text: string;
  points: number;
  aliases?: string[];
}

export interface SurveyQuestion {
  id: string;
  prompt: string;
  category: string;
  answers: AnswerSlot[];
}

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'ROUND_SUMMARY' | 'GAME_OVER';

export type PlayMode = 'TWO_TEAMS' | 'FREE_PLAY';

export type AutoSwitchRule = 'OFF' | 'EVERY_WRONG' | 'THREE_STRIKES';

export type SoundTheme = 'STUDIO' | 'FAMILY_100' | 'ARCADE' | 'ARENA' | 'MINIMAL';

export interface SoundConfig {
  muted: boolean;
  volume: number;
  theme: SoundTheme;
  enableCorrect: boolean;
  enableStrike: boolean;
  enableFanfare: boolean;
  enableTurnSwitch: boolean;
}

export interface TeamInfo {
  id: 'A' | 'B';
  name: string;
  score: number;
}

export interface SubmissionFeedback {
  type: 'correct' | 'duplicate' | 'wrong' | 'info';
  message: string;
  matchedText?: string;
  pointsAwarded?: number;
}
