export type WeeklyGesture = { x: number; y: number; direction: "pending" | "horizontal" | "vertical" };
export function updateWeeklyGesture(gesture: WeeklyGesture, x: number, y: number): WeeklyGesture {
  const dx = Math.abs(x - gesture.x), dy = Math.abs(y - gesture.y);
  if (gesture.direction === "vertical" || Math.max(dx, dy) < 12) return gesture;
  // Ambiguous diagonals belong to scrolling. Once rejected, never reactivate.
  if (dy * 2 >= dx) return {...gesture, direction: "vertical"};
  return {...gesture, direction: "horizontal"};
}
export function finishWeeklyGesture(gesture: WeeklyGesture, x: number, y: number): "previous" | "next" | null {
  const final = updateWeeklyGesture(gesture, x, y);
  const dx = x - gesture.x;
  if (final.direction !== "horizontal" || Math.abs(dx) < 80 || Math.abs(dx) <= Math.abs(y - gesture.y) * 2) return null;
  return dx > 0 ? "previous" : "next";
}
