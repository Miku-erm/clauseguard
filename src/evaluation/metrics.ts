export interface Reference {
  id: string; documentId: string; category: string; chunkId: string; start: number; end: number;
  severity: string; status: 'DRAFT' | 'PENDING_HUMAN_REVIEW' | 'HUMAN_VERIFIED'; section: string; rationale: string;
}
export interface Prediction {
  id: string; documentId: string; category: string; chunkId: string; start: number; end: number;
  severity: string;
}
// Semantic support is reviewed separately from quotation validity. No lexical guess can grant a TP.
export interface SemanticReview { predictionId: string; referenceId: string; verdict: 'SUPPORTED' | 'CONTRADICTORY' | 'UNREVIEWED'; rationale: string }
export const rates = (tp: number, fp: number, fn: number) => ({ tp, fp, fn,
  precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null,
  f1: 2 * tp + fp + fn ? 2 * tp / (2 * tp + fp + fn) : null });
export function evaluate(gold: Reference[], predictions: Prediction[], reviews: SemanticReview[], evaluated: boolean) {
  if (!evaluated) return { evaluated: false as const, provisional: true, matches: [], falsePositives: [], falseNegatives: [], metrics: null, severityAgreement: null };
  const supported = new Set(reviews.filter(r => r.verdict === 'SUPPORTED').map(r => `${r.predictionId}\0${r.referenceId}`));
  const edges = predictions.map(p => gold.flatMap((g, index) => {
    const overlap = Math.max(0, Math.min(p.end, g.end) - Math.max(p.start, g.start));
    return p.documentId === g.documentId && p.category === g.category && p.chunkId === g.chunkId &&
      overlap > 0 && overlap / Math.min(p.end - p.start, g.end - g.start) >= 0.5 &&
      supported.has(`${p.id}\0${g.id}`) ? [index] : [];
  }));
  // Maximum cardinality bipartite matching, deterministic input-order tie breaking.
  const owners = new Map<number, number>();
  const augment = (p: number, visited: Set<number>): boolean => {
    for (const g of edges[p]!) {
      if (visited.has(g)) continue; visited.add(g);
      const previous = owners.get(g);
      if (previous === undefined || augment(previous, visited)) { owners.set(g, p); return true; }
    }
    return false;
  };
  predictions.forEach((_, index) => augment(index, new Set()));
  const matches = [...owners].sort(([a], [b]) => a - b).map(([g, p]) => ({ referenceId: gold[g]!.id, predictionId: predictions[p]!.id, severityAgrees: gold[g]!.severity === predictions[p]!.severity }));
  const used = new Set(owners.values());
  return { evaluated: true as const, provisional: gold.some(g => g.status !== 'HUMAN_VERIFIED'), matches,
    falsePositives: predictions.filter((_, p) => !used.has(p)).map(p => p.id),
    falseNegatives: gold.filter((_, g) => !owners.has(g)).map(g => g.id),
    metrics: rates(matches.length, predictions.length - matches.length, gold.length - matches.length),
    severityAgreement: matches.length ? matches.filter(m => m.severityAgrees).length / matches.length : null };
}
