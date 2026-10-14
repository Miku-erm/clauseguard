import { CATEGORY_IDS, CATEGORIES } from './categories';
import { verifiedFindingSchema, type VerifiedFinding } from './schema';
const severityTenths = { LOW: 4, MEDIUM: 7, HIGH: 10 } as const;
export function deduplicateFindings(findings: VerifiedFinding[]): VerifiedFinding[] {
  const groups = new Map<string, VerifiedFinding>();
  for (const item of findings) {
    const finding = verifiedFindingSchema.parse(item); const existing = groups.get(finding.findingId);
    if (!existing || severityTenths[finding.severity] > severityTenths[existing.severity] || (finding.severity === existing.severity && JSON.stringify(finding).localeCompare(JSON.stringify(existing)) < 0)) groups.set(finding.findingId, finding);
  }
  return [...groups.values()].sort((a, b) => a.findingId.localeCompare(b.findingId));
}
export function alarmForScore(score: number): 'LOW' | 'CAUTION' | 'HIGH' | 'CRITICAL' {
  if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error('Invalid score');
  return score < 20 ? 'LOW' : score < 40 ? 'CAUTION' : score < 70 ? 'HIGH' : 'CRITICAL';
}
/** Integer tenths internally; round the final sum to nearest integer, halves upward, cap 100. */
export function calculateScore(findings: VerifiedFinding[]) {
  const categoryScores: Record<string, number> = {}; let totalTenths = 0;
  for (const id of CATEGORY_IDS) {
    const highest = Math.max(0, ...findings.filter(finding => verifiedFindingSchema.parse(finding).category === id).map(finding => severityTenths[finding.severity]));
    const tenths = CATEGORIES[id].weight * highest; categoryScores[id] = tenths / 10; totalTenths += tenths;
  }
  const score = Math.min(100, Math.round(totalTenths / 10)); return { score, alarmLevel: alarmForScore(score), categoryScores };
}
