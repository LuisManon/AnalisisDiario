import { Ball } from "./Ball";

type DrawBallsProps = {
  numbers: number[];
  plus: number;
};

export function DrawBalls({ numbers, plus }: DrawBallsProps) {
  return (
    <div className="ballsRow">
      {numbers.map((number) => (
        <Ball key={number} value={number} />
      ))}
      <Ball value={plus} plus />
    </div>
  );
}
