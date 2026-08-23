import { Ball } from "./Ball";

type DrawBallsProps = {
  numbers: number[];
  plus: number;
  winningNumbers?: number[];
  winningPlus?: number;
};

export function DrawBalls({ numbers, plus, winningNumbers = [], winningPlus }: DrawBallsProps) {
  return (
    <div className="ballsRow">
      {numbers.map((number) => (
        <Ball key={number} value={number} winner={winningNumbers.includes(number)} />
      ))}
      <Ball value={plus} plus winner={plus === winningPlus} />
    </div>
  );
}
