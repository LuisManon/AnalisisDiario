type BallProps = {
  value: number;
  plus?: boolean;
  muted?: boolean;
  winner?: boolean;
};

export function Ball({ value, plus = false, muted = false, winner = false }: BallProps) {
  return (
    <span className={`ball ${plus ? "ballPlus" : ""} ${muted ? "ballMuted" : ""} ${winner ? (plus ? "ballWinnerPlus" : "ballWinnerLoto") : ""}`}>
      {String(value).padStart(2, "0")}
    </span>
  );
}
