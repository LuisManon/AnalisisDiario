import fs from "node:fs";
import { buildKinoV10RetrospectiveSnapshot, buildKinoV11CandidatePlays, kinoPrize, type KinoDraw, type KinoPlay } from "../lib/super-kino.ts";

const draws=JSON.parse(fs.readFileSync("data/super-kino-results.json","utf8")) as KinoDraw[];
const formatDraws=draws.filter(draw=>draw.date>="2026-09-15").sort((a,b)=>a.date.localeCompare(b.date));
const start=process.argv[2]??formatDraws[10]?.date;
const end=process.argv[3]??draws[0]?.date;
const validationStart=process.argv[4]??"2026-10-25";
const dates=draws.filter(draw=>draw.date>=start&&draw.date<=end).map(draw=>draw.date).sort();

function evaluate(plays:KinoPlay[],draw:KinoDraw) {
  const hits=plays.map(play=>play.numbers.filter(number=>draw.numbers.includes(number)).length);
  return {
    prize:hits.reduce((sum,count)=>sum+kinoPrize(count),0),
    maximum:Math.max(...hits),
    winners:hits.filter(count=>kinoPrize(count)>0).length
  };
}

const rows=dates.map(date=>{
  const draw=draws.find(item=>item.date===date)!;
  const priorFormatDraws=formatDraws.filter(item=>item.date<date).length;
  const v10=priorFormatDraws>=30?buildKinoV10RetrospectiveSnapshot(draws,date):null;
  const v11=buildKinoV11CandidatePlays(draws,date);
  const exposure=Object.values(v11.exposure);
  return {
    date,
    v10:v10?evaluate(v10.plays,draw):null,
    v11:evaluate(v11.plays,draw),
    v11Exposure:[Math.min(...exposure),Math.max(...exposure)] as const
  };
});

function summarize(selected:typeof rows) {
  const result=(key:"v10"|"v11")=>{
    const comparable=selected.flatMap(row=>row[key]?[row[key]]:[]);
    const cost=comparable.length*200*25;
    const prize=comparable.reduce((sum,row)=>sum+row.prize,0);
    return {draws:comparable.length,prize,cost,net:prize-cost,roi:Number((prize/cost*100).toFixed(2)),maximum:Math.max(...comparable.map(row=>row.maximum))};
  };
  return {v10:result("v10"),v11:result("v11")};
}

console.table(rows.map(row=>({
  date:row.date,
  "V10 premio":row.v10?.prize??"—",
  "V11 premio":row.v11.prize,
  "V10 máximo":row.v10?.maximum??"—",
  "V11 máximo":row.v11.maximum,
  "V11 exposición":row.v11Exposure.join("–")
})));
console.log(JSON.stringify({
  period:{start,end,validationStart},
  firstTenPrior:summarize(rows.filter(row=>formatDraws.filter(item=>item.date<row.date).length<20)),
  firstTwentyPrior:summarize(rows.filter(row=>{const prior=formatDraws.filter(item=>item.date<row.date).length;return prior>=20&&prior<30;})),
  matchedThirtyPrior:summarize(rows.filter(row=>formatDraws.filter(item=>item.date<row.date).length>=30)),
  reservedValidation:summarize(rows.filter(row=>row.date>=validationStart)),
  complete:summarize(rows),
  theoreticalRandomRoi:56.70
},null,2));
