// Système éducatif guinéen : Primaire /10, Collège & Lycée /20
export function maxScoreForLevel(level?: string | null): 10 | 20 {
  if (!level) return 20;
  return /primaire/i.test(level) ? 10 : 20;
}

export function scaleLabel(max: 10 | 20): string {
  return `/ ${max}`;
}
