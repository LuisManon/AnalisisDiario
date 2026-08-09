type BallProps = {
  value: number;
  plus?: boolean;
  muted?: boolean;
};

export function Ball({ value, plus = false, muted = false }: BallProps) {
  return (
    <span className={`ball ${plus ? "ballPlus" : ""} ${muted ? "ballMuted" : ""}`}>
      {String(value).padStart(2, "0")}
    </span>
  );
}
