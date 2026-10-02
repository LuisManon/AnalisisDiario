import assert from "node:assert/strict";
import { test } from "node:test";
import { updateWeeklyGesture, finishWeeklyGesture, type WeeklyGesture } from "../lib/weekly-swipe.ts";
const start = (): WeeklyGesture => ({x:0,y:0,direction:"pending"});
test("vertical scrolling stays locked even if the finger later moves horizontally", () => {
  const gesture=updateWeeklyGesture(start(),3,20);
  assert.equal(gesture.direction,"vertical");
  assert.equal(finishWeeklyGesture(gesture,150,30),null);
  assert.equal(finishWeeklyGesture(start(),20,200),null);
});
test("small and diagonal gestures cannot change week", () => {
  assert.equal(finishWeeklyGesture(start(),79,0),null);
  assert.equal(finishWeeklyGesture(start(),100,60),null);
  const diagonal=updateWeeklyGesture(start(),14,10);
  assert.equal(finishWeeklyGesture(diagonal,150,20),null);
});
test("intentional horizontal swipes navigate in both directions", () => {
  assert.equal(finishWeeklyGesture(updateWeeklyGesture(start(),20,3),100,10),"previous");
  assert.equal(finishWeeklyGesture(updateWeeklyGesture(start(),-20,3),-100,10),"next");
});
test("a horizontal gesture that becomes scrolling is cancelled", () => {
  const horizontal=updateWeeklyGesture(start(),20,1);
  const vertical=updateWeeklyGesture(horizontal,25,30);
  assert.equal(finishWeeklyGesture(vertical,160,30),null);
});
