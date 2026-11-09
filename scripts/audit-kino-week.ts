/** Read-only: node --experimental-strip-types scripts/audit-kino-week.ts YYYY-MM-DD YYYY-MM-DD */
import {readFile,readdir} from "node:fs/promises";
import {auditKinoWeek} from "../lib/kino-week-audit.ts";
import {kinoDrawSchema,kinoSnapshotSchema} from "../lib/super-kino.ts";

const [from,to]=process.argv.slice(2);
if(!from||!to)throw new Error("Specify inclusive start and end dates (maximum seven days)");
const root=new URL("../data/",import.meta.url);
const draws=kinoDrawSchema.array().parse(JSON.parse(await readFile(new URL("super-kino-results.json",root),"utf8")));
const directory=new URL("super-kino-portfolios/",root);
const names=(await readdir(directory)).filter(name=>/^\d{4}-\d{2}-\d{2}\.json$/.test(name)&&name.slice(0,10)>=from&&name.slice(0,10)<=to).sort();
const snapshots=await Promise.all(names.map(async name=>kinoSnapshotSchema.parse(JSON.parse(await readFile(new URL(name,directory),"utf8")))));
console.log(JSON.stringify(auditKinoWeek({from,to,draws:draws.filter(draw=>draw.date>=from&&draw.date<=to),snapshots}),null,2));
