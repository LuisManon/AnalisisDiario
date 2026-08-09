import fs from "node:fs/promises";
import path from "node:path";
import { getDrawDay, type VirtualTicket } from "./game";

const ticketPath = path.join(process.cwd(), "data", "virtual-ticket.json");

export async function readVirtualTicket(drawDate: string): Promise<VirtualTicket | null> {
  try {
    const raw = await fs.readFile(ticketPath, "utf8");
    const ticket = JSON.parse(raw) as VirtualTicket;
    return ticket.drawDate === drawDate ? ticket : null;
  } catch {
    return null;
  }
}

export async function writeVirtualTicket(ticket: VirtualTicket) {
  const normalized = {
    ...ticket,
    day: ticket.day || getDrawDay(ticket.drawDate),
    plays: ticket.plays.map((play, index) => ({ ...play, id: index + 1 }))
  };
  await fs.writeFile(ticketPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}
