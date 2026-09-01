import { z } from "zod";

export const drawSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day: z.enum(["miercoles", "sabado"]),
  numbers: z.array(z.number().int().min(1).max(40)).length(6),
  plus: z.number().int().min(1).max(12),
  source: z.string().optional()
});

export const playSchema = z.object({
  id: z.number().int().positive(),
  numbers: z.array(z.number().int().min(1).max(40)).length(6),
  plus: z.number().int().min(1).max(12)
});

export const simulationRequestSchema = z.object({
  drawDate: z.string().optional(),
  manualDraw: drawSchema.optional(),
  plays: z.array(playSchema).min(5)
});

export const laPrimeraDrawSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session: z.enum(["dia", "noche"]),
  number: z.number().int().min(0).max(99),
  drawId: z.number().int().positive().optional(),
  source: z.string().optional()
});

export const laPrimeraQuinielaDrawSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session: z.enum(["dia", "noche"]),
  numbers: z.tuple([
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99)
  ]),
  drawId: z.number().int().positive().optional(),
  source: z.string().optional()
});

export const lotekaRepartideraDrawSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  number: z.number().int().min(0).max(99),
  source: z.string().optional()
});

export const quinielaPaleDrawSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numbers: z.tuple([
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99)
  ]),
  source: z.string().optional()
});
