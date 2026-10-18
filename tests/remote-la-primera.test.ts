import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeLaPrimeraResults, parseLaBancaQuinielon } from "../lib/la-primera-result-sources.ts";

test("La Banca Quinielón pages become clearly marked provisional results", () => {
  const html = "<p>El número ganador de Quinielón Día La Primera del 17 de octubre de 2026 fue 32.</p>";
  assert.deepEqual(parseLaBancaQuinielon(html, "2026-10-17", "dia", "https://example.test/day"), {
    date: "2026-10-17",
    session: "dia",
    number: 32,
    source: "https://example.test/day",
    verification: "provisional"
  });
});

test("La Banca parser requires the requested date and session", () => {
  const html = "El número ganador de Quinielón Noche La Primera del 17 de octubre de 2026 fue 04.";
  assert.equal(parseLaBancaQuinielon(html, "2026-10-17", "dia"), null);
  assert.equal(parseLaBancaQuinielon(html, "2026-10-18", "noche"), null);
  assert.equal(parseLaBancaQuinielon(html, "fecha-invalida", "noche"), null);
  assert.equal(parseLaBancaQuinielon(html, "2026-10-17", "noche")?.number, 4);
});

test("official La Primera result always replaces a provisional result", () => {
  const provisional = { date: "2026-10-17", session: "noche" as const, number: 4, source: "https://labanca.do/example", verification: "provisional" as const };
  const confirmed = { date: "2026-10-17", session: "noche" as const, number: 14, source: "https://laprimera.do/resultados/", verification: "confirmed" as const };

  assert.deepEqual(mergeLaPrimeraResults([provisional, confirmed]), [confirmed]);
  assert.deepEqual(mergeLaPrimeraResults([confirmed, provisional]), [confirmed]);
});
