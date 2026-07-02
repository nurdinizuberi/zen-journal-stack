// src/utils/morningFuel.ts

export interface FuelQuote {
  quote: string;
  author: string;
  focusTag: string;
}

export const MORNING_FUEL_DB: FuelQuote[] = [
  {
    quote: "Simplicity is the soul of efficiency. Build modular, think macro.",
    author: "Austin Freeman",
    focusTag: "Architecture"
  },
  {
    quote: "The market moves in waves of discipline. Your execution must match your technical blueprint flawlessly.",
    author: "Market Alpha",
    focusTag: "Execution"
  },
  {
    quote: "Do not seek speed. Seek clean iteration loops. Speed naturally emerges from elegant systems.",
    author: "Pragmatic Dev",
    focusTag: "UI/UX"
  },
  {
    quote: "Visions without deliberate daily metrics are just structural illusions.",
    author: "Horizon Mapper",
    focusTag: "Strategy"
  },
  {
    quote: "Great designs are not deep because they are complex; they are deep because they are incredibly clear.",
    author: "Mies van der Rohe",
    focusTag: "Design"
  }
];

export function getDailyFuel(userName: string): FuelQuote {
  if (typeof window === 'undefined' || !userName) return MORNING_FUEL_DB[0];
  
  // Calculate a basic hash from the username to differentiate users
  let nameHash = 0;
  for (let i = 0; i < userName.length; i++) {
    nameHash += userName.charCodeAt(i);
  }

  // Combine calendar day index with the user's identity variance seed
  const totalDays = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const uniqueSeed = totalDays + nameHash;
  const dailyIndex = uniqueSeed % MORNING_FUEL_DB.length;
  
  return MORNING_FUEL_DB[dailyIndex];
}