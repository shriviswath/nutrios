import type { Food } from "@/lib/types";

export interface RankedFood {
  food: Food;
  score: number;
  reason: "recent" | "frequent" | "favorite" | "match";
}

export interface UsageStat {
  count: number;
  lastUsed: number;
}

const DAY = 86_400_000;

/**
 * Ranking is deliberately not pure text relevance. The food you ate yesterday is far more
 * likely to be the food you are logging now than a better string match you have never eaten,
 * so usage recency and frequency carry real weight.
 */
export function rankFoods(
  foods: Food[],
  query: string,
  usage: Map<string, UsageStat>,
  limit = 40,
): RankedFood[] {
  const q = query.trim().toLowerCase();
  const now = Date.now();

  const scored = foods.map((food) => {
    const name = food.name.toLowerCase();
    const stat = usage.get(food.id);
    let textScore = 0;
    let reason: RankedFood["reason"] = "match";

    if (q) {
      if (name === q) textScore = 100;
      else if (name.startsWith(q)) textScore = 80;
      else if (wordStarts(name, q)) textScore = 65;
      else if (name.includes(q)) textScore = 45;
      else if (food.category.toLowerCase().includes(q)) textScore = 20;
      else if (subsequence(name, q)) textScore = 12;
      else return null;
    } else {
      textScore = 10;
    }

    let personal = 0;
    if (stat) {
      const days = (now - stat.lastUsed) / DAY;
      const recency = Math.max(0, 30 - days) / 30; // decays over a month
      personal = Math.min(25, stat.count * 2) + recency * 20;
      reason = days < 3 ? "recent" : "frequent";
    }
    if (food.favorite) {
      personal += 15;
      if (!stat) reason = "favorite";
    }

    return { food, score: textScore + personal, reason };
  });

  return scored
    .filter((s): s is RankedFood => s !== null)
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
    .slice(0, limit);
}

function wordStarts(name: string, q: string): boolean {
  return name.split(/[\s(,/-]+/).some((w) => w.startsWith(q));
}

/** Loose match so "chkn bryni" still finds chicken biryani. */
function subsequence(name: string, q: string): boolean {
  let i = 0;
  for (const ch of name) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}
