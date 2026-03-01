// ============================================
// SCORECARD DIMENSIONS
// Labels and display config for the 5 scoring axes.
// ============================================

export const DIMENSIONS = [
  { key: 'empathy', label: 'Empathy & Rapport', icon: '💛' },
  { key: 'objectionHandling', label: 'Objection Handling', icon: '🛡️' },
  { key: 'clarity', label: 'Clarity & Value', icon: '💎' },
  { key: 'closingTechnique', label: 'Closing Technique', icon: '🎯' },
  { key: 'activeListening', label: 'Active Listening', icon: '👂' },
];

export function getScoreClass(score) {
  if (score >= 70) return 'high';
  if (score >= 45) return 'mid';
  return 'low';
}

export function getGradeColor(grade) {
  if (!grade) return 'var(--text-muted)';
  const letter = grade.charAt(0);
  if (letter === 'A') return 'var(--green)';
  if (letter === 'B') return 'var(--gold)';
  if (letter === 'C') return 'var(--gold)';
  return 'var(--red)';
}
