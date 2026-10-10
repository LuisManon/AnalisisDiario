import { NextResponse } from "next/server";
import { readResults } from "../../../lib/data";
import { getDominicanNow, getNextGameDate, summarizeHundredPlayExploratoryPrizes, summarizeThirtyPlayPrizes } from "../../../lib/game";
import { getOrCreatePortfolio, readSavedPortfolios } from "../../../lib/portfolio-store";
import { getOrCreateExploratoryPortfolio, readExploratoryPortfolios } from "../../../lib/exploratory-portfolio-store";

function weekDrawDates(targetDate: string) {
  const target = new Date(`${targetDate}T12:00:00Z`);
  const day = target.getUTCDay();
  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return [2, 5].map((offset) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get("drawDate") || getNextGameDate();
  const results = await readResults();
  const current = await getOrCreatePortfolio(targetDate, results);
  const previousDraw = results.find((draw) => draw.date < targetDate) ?? null;
  const previous = previousDraw ? await getOrCreatePortfolio(previousDraw.date, results) : null;
  const saved = await readSavedPortfolios();
  const now = getDominicanNow();
  const calendarDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const todayIsDrawDay = now.getDay() === 3 || now.getDay() === 6;
  const todayResult = results.find((draw) => draw.date === calendarDate);
  const exploratoryTargetDate = todayIsDrawDay && !todayResult ? calendarDate : targetDate;
  const exploratoryCurrent = await getOrCreateExploratoryPortfolio(exploratoryTargetDate, results);
  const exploratorySaved = await readExploratoryPortfolios();
  const exploratoryEvaluated = exploratorySaved.flatMap((portfolio) => {
    const draw = results.find((item) => item.date === portfolio.targetDate);
    return draw ? [{
      targetDate: portfolio.targetDate,
      targetDay: portfolio.targetDay,
      generatedAt: portfolio.generatedAt,
      playCount: portfolio.plays.length,
      summary: summarizeHundredPlayExploratoryPrizes(portfolio, draw)
    }] : [];
  }).slice(0, 4);
  const drawDates = weekDrawDates(calendarDate);
  const calendar = drawDates.map((date, index) => {
    const portfolio = saved.find((item) => item.targetDate === date) ?? (current.targetDate === date ? current : null);
    const draw = results.find((item) => item.date === date);
    return {
      date,
      day: index === 0 ? "miercoles" : "sabado",
      summary: portfolio && draw ? summarizeThirtyPlayPrizes(portfolio, draw) : null,
      status: date < calendarDate && !portfolio ? "missing" : "pending"
    };
  });

  return NextResponse.json({
    current,
    previous: previous && previousDraw ? { ...previous, draw: previousDraw } : null,
    calendar,
    exploratory: {
      current: {
        targetDate: exploratoryCurrent.targetDate,
        targetDay: exploratoryCurrent.targetDay,
        generatedAt: exploratoryCurrent.generatedAt,
        playCount: exploratoryCurrent.plays.length,
        summary: todayResult && todayResult.date === exploratoryCurrent.targetDate
          ? summarizeHundredPlayExploratoryPrizes(exploratoryCurrent, todayResult)
          : null
      },
      evaluated: exploratoryEvaluated
    }
  });
}
