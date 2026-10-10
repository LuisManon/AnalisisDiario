export type DrawDay = "miercoles" | "sabado";

export type DrawResult = {
  date: string;
  day: DrawDay;
  numbers: number[];
  plus: number;
  source?: string;
};

export type Play = {
  id: number;
  numbers: number[];
  plus: number;
};

export type RecommendedPlay = Play & {
  score: number;
  profile: "fuerte" | "equilibrada" | "exploratoria";
  daySupportCount: number;
};

export type PortfolioScope = "mismo-dia" | "historial-completo";

export type PortfolioPlay = RecommendedPlay & {
  scope: PortfolioScope;
  previousDrawRepeats: number;
  previousSameDayRepeats: number;
  inRangeCount: number;
  p1p3Nearby: number;
  positionalDelayAlert: string | null;
  explanation: string;
};

export type ThirtyPlayPortfolio = {
  targetDate: string;
  targetDay: DrawDay;
  generatedAt: string;
  algorithmVersion?: string;
  plusTopFive?: number[];
  plays: PortfolioPlay[];
  exposure: Array<{ number: number; count: number }>;
};

export type ThirtyPlayPrizeGroup = {
  matches: number;
  plusMatched: boolean;
  amount: number;
  label: string;
  count: number;
  total: number;
};

export type ThirtyPlayPrizeSummary = {
  groups: ThirtyPlayPrizeGroup[];
  winningPlays: number;
  total: number;
};

export type HundredPlayExploratoryPortfolio = {
  targetDate: string;
  targetDay: DrawDay;
  generatedAt: string;
  algorithmVersion: string;
  plays: Play[];
};

export type HundredPlayExploratoryResult = {
  targetDate: string;
  targetDay: DrawDay;
  generatedAt: string;
  playCount: number;
  summary: ThirtyPlayPrizeSummary | null;
};

export type DayFilter = DrawDay | "todos";

export type SimulationResult = {
  play: Play;
  matchedNumbers: number[];
  plusMatched: boolean;
  score: number;
};

export type LaPrimeraSession = "dia" | "noche";

export type LaPrimeraFilter = LaPrimeraSession | "todos";

export type LaPrimeraDraw = {
  date: string;
  session: LaPrimeraSession;
  number: number;
  drawId?: number;
  source?: string;
};

export type LaPrimeraQuinielaDraw = {
  date: string;
  session: LaPrimeraSession;
  numbers: [number, number, number];
  drawId?: number;
  source?: string;
};

export type LaPrimeraLoto5Draw = {
  date: string;
  numbers: [number, number, number, number, number];
  plus: number;
  drawId?: number;
  source?: string;
};

export type Loto5Profile = "fuerte" | "equilibrada" | "exploratoria";

export type Loto5PortfolioPlay = {
  id: number;
  profile: Loto5Profile;
  numbers: [number, number, number, number, number];
  plus: number;
  score: number;
  exactPositionRepeat: boolean;
  explanation: string;
};

export type Loto5PortfolioSnapshot = {
  targetDate: string;
  generatedAt: string;
  algorithmVersion: string;
  historicalThrough: string | null;
  plays: Loto5PortfolioPlay[];
};

export type LotekaRepartideraDraw = {
  date: string;
  number: number;
  source?: string;
};

export type QuinielaPaleDraw = {
  date: string;
  numbers: [number, number, number];
  source?: string;
};
