import { describe, expect, it } from 'vitest';
import { evaluate, rates, type Reference, type Prediction, type SemanticReview } from '../../src/evaluation/metrics';
import { identifyType } from '../../src/extraction/identify';
const g: Reference = { id: 'g', documentId: 'd', category: 'RENEWAL', chunkId: 'c', start: 10, end: 50, severity: 'HIGH', status: 'DRAFT', section: 'Renewal', rationale: 'Direct reading' };
const p: Prediction = { ...g, id: 'p' };
const r: SemanticReview = { predictionId: 'p', referenceId: 'g', verdict: 'SUPPORTED', rationale: 'Both describe no-notice charging' };
describe('independent evaluation', () => {
  it('requires semantic review even for an exact quotation', () => { expect(evaluate([g], [p], [], true).metrics).toEqual(rates(0, 1, 1)); });
  it('rejects contradictory semantic interpretation', () => { expect(evaluate([g], [p], [{ ...r, verdict: 'CONTRADICTORY' }], true).matches).toHaveLength(0); });
  it('matches once and separates severity', () => { const result = evaluate([g], [p, { ...p, id: 'duplicate' }], [r], true); expect(result.metrics).toEqual(rates(1, 1, 0)); expect(result.provisional).toBe(true); expect(result.severityAgreement).toBe(1); });
  it('one prediction cannot satisfy two references', () => { expect(evaluate([g, { ...g, id: 'g2' }], [p], [r, { ...r, referenceId: 'g2' }], true).metrics).toEqual(rates(1, 0, 1)); });
  it('uses maximum matching rather than greedy assignment', () => { const p2 = { ...p, id: 'p2' }; const g2 = { ...g, id: 'g2' }; expect(evaluate([g, g2], [p, p2], [r, { ...r, referenceId: 'g2' }, { ...r, predictionId: 'p2' }], true).matches).toHaveLength(2); });
  it('rejects wrong document/category/chunk/disjoint span', () => { for (const change of [{ documentId: 'x' }, { category: 'x' }, { chunkId: 'x' }, { start: 60, end: 80 }]) expect(evaluate([g], [{ ...p, ...change }], [r], true).matches).toHaveLength(0); });
  it('does not make an empty or unevaluated case a perfect negative', () => { expect(evaluate([], [], [], true).metrics).toEqual(rates(0, 0, 0)); expect(evaluate([g], [], [], false).metrics).toBeNull(); });
  it('defines one-sided zero denominators', () => { expect(rates(0, 0, 2)).toEqual({ tp: 0, fp: 0, fn: 2, precision: null, recall: 0, f1: 0 }); });
  it('does not fabricate human verification', () => { expect(evaluate([{ ...g, status: 'PENDING_HUMAN_REVIEW' }], [p], [r], true).provisional).toBe(true); });
});
describe('general title recognition', () => {
  it.each(['Privacy Notice', 'Privacy Statement', 'Gizlilik Bildirimi', 'Gizlilik Politikası'])('recognizes %s', title => expect(identifyType(title)).toBe('privacy_policy'));
  it.each(['User Agreement', 'Terms of Use', 'Terms of Service', 'Kullanım Hüküm ve Koşulları'])('recognizes %s', title => expect(identifyType(title)).toBe('terms_of_service'));
  it('does not identify a random article', () => expect(identifyType('Home gardening guide')).toBe('unknown'));
});
