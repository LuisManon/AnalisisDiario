import assert from "node:assert/strict";
import {test} from "node:test";
import {orderAnalysisPanels} from "../lib/analysis-navigation.ts";

test("results is first for every workspace without losing panels or mutating input",()=>{
  for(const ids of [["analizar","jugadas","resultados","historial"],["analizar","reparto","resultados","historial"]]) {
    const input=ids.map(id=>({id,content:{id}}));
    const ordered=orderAnalysisPanels(input);
    assert.deepEqual(ordered.map(panel=>panel.id),["resultados",...ids.filter(id=>id!=="resultados")]);
    assert.deepEqual(input.map(panel=>panel.id),ids);
    assert.equal(ordered[0],input[2]);
    assert.deepEqual(orderAnalysisPanels(ordered),ordered);
  }
});
test("workspaces without results keep their original order",()=>{
  assert.deepEqual(orderAnalysisPanels([{id:"analizar"},{id:"historial"}]),[{id:"analizar"},{id:"historial"}]);
  assert.deepEqual(orderAnalysisPanels([]),[]);
});
