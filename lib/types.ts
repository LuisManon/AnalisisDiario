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

export type LotekaRepartideraDraw = {
  date: string;
  number: number;
  source?: string;
};
