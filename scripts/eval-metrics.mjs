import { readFileSync,writeFileSync,mkdirSync,readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadRisk } from './load-risk.mjs';
const risk=await loadRisk(); const {evaluate,rates,CATEGORY_IDS}=risk;
const gold=JSON.parse(readFileSync('evaluation/annotations/gold.json','utf8')).labels;
const predictionDir=process.env.CLAUSEGUARD_EVAL_DIR??'.local/p4/predictions';
const publicDir=process.env.CLAUSEGUARD_EVAL_PUBLIC_DIR??'evaluation/predictions';
const results=JSON.parse(readFileSync(`${predictionDir}/latest.json`,'utf8'));
const summary=JSON.parse(readFileSync(`${publicDir}/latest.json`,'utf8'));
const freshEvidence=readdirSync(publicDir).filter(p=>/^run-\d+\.json$/.test(p)).sort().reverse().map(p=>JSON.parse(readFileSync(`${publicDir}/${p}`,'utf8'))).find(r=>r.freshCalls>0&&JSON.stringify(r.config)===JSON.stringify(summary.config));
if(!freshEvidence)throw new Error('Missing original native evidence for this configuration; metrics cannot invent response counts');
const nativeCalls=JSON.parse(readFileSync(freshEvidence.privateNetwork,'utf8'));
let rawAccepted=0,rawRejected=0,invalidStructured=0,invalidJson=0;
for(const call of nativeCalls){
  if(typeof call.response?.message?.content==='string')try{JSON.parse(call.response.message.content)}catch{invalidJson++}
  let decoded;try{decoded=risk.decodeRiskResponse(call.response,0,call.request.options.num_predict)}catch{invalidStructured++;continue}
  const user=JSON.parse(call.request.messages[1].content);const ids=new Set(user.sourceData.map(c=>c.sourceChunkId));
  const candidates=results.map(r=>JSON.parse(readFileSync(`.local/p4/real/${r.sourceId}.json`,'utf8'))).filter(d=>d.title===user.documentTitle&&d.sourceChunks.some(c=>ids.has(c.chunkId)));
  if(candidates.length!==1)throw new Error('Native evidence cannot be associated with one immutable document');
  for(const p of decoded.proposal.findings){const v=await risk.verifyFinding(candidates[0],p,candidates[0].contentHash,ids);if(v.accepted)rawAccepted++;if(v.rejected)rawRejected++;}
}
const inputReviews=JSON.parse(readFileSync(process.env.CLAUSEGUARD_SEMANTIC_REVIEWS??'evaluation/annotations/semantic-reviews.json','utf8'));
const fingerprints=new Map(results.flatMap(r=>r.findings.map((f,i)=>[`${r.sourceId}-p${i+1}`,createHash('sha256').update(JSON.stringify(f)).digest('hex')])));
// A later fresh run must not inherit a semantic judgment for a different finding with the same ordinal ID.
const reviews=inputReviews.filter(r=>r.predictionFingerprint && r.predictionFingerprint===fingerprints.get(r.predictionId));
const documents=[],errors=[];const allGold=[],allPredictions=[];
for(const r of results){
 const labels=gold.filter(g=>g.documentId===r.documentId);
 const doc=JSON.parse(readFileSync(`.local/p4/real/${r.sourceId}.json`,'utf8'));
 // Restrict metrics to predeclared reference chunks. Other findings remain visible but unscored.
 const scope=new Set(labels.map(g=>g.chunkId));
 const predictions=r.findings.map((f,i)=>({id:`${r.sourceId}-p${i+1}`,documentId:r.documentId,category:f.category,chunkId:f.sourceChunkId,start:f.evidence.start,end:f.evidence.end,severity:f.severity}));
 const evaluatedPredictions=predictions.filter(p=>scope.has(p.chunkId));
 const evaluated=labels.some(g=>r.analyzedChunks.includes(g.chunkId));
 const comparison=evaluate(labels,evaluatedPredictions,reviews,evaluated);
 documents.push({sourceId:r.sourceId,...comparison,unscoredPredictions:predictions.filter(p=>!scope.has(p.chunkId)).map(p=>p.id),extractionCoverage:r.extractionCoverage,analysisCoverage:{analyzed:r.analyzedChunks.length,total:r.totalChunks,ratio:r.totalChunks?r.analyzedChunks.length/r.totalChunks:null},durationMs:r.durationMs,modelCalls:r.modelCalls,evidenceValidity:r.findings.length+r.rejected.length?r.findings.length/(r.findings.length+r.rejected.length):null});
 if(evaluated){allGold.push(...labels);allPredictions.push(...evaluatedPredictions)}
 for(const id of comparison.falseNegatives){const g=labels.find(g=>g.id===id);errors.push({kind:'FN',document:r.sourceId,section:g.section,category:g.category,expectedReference:g.id,actual:r.findings.filter(f=>f.sourceChunkId===g.chunkId).map(f=>({category:f.category,severity:f.severity})),evidence:{chunkId:g.chunkId,start:g.start,end:g.end},sourceExtracted:doc.sourceChunks.some(c=>c.chunkId===g.chunkId),chunkAnalyzed:r.analyzedChunks.includes(g.chunkId),evidenceRejected:r.rejected.some(f=>f.proposal.sourceChunkId===g.chunkId),failureType:r.unbatchable.includes(g.chunkId)?'INSUFFICIENT_CONTEXT':!r.analyzedChunks.includes(g.chunkId)?(r.report?.coverage.batches.some(b=>b.chunkIds.includes(g.chunkId)&&b.status==='FAILED')?'MODEL_RESPONSE_FAILURE':'INCOMPLETE_ANALYSIS'):r.rejected.some(f=>f.proposal.sourceChunkId===g.chunkId)?'EVIDENCE_REJECTION':'MODEL_SEMANTIC_FAILURE',possibleRootCause:'Inspect private native response and independent clause rationale; missing reference category is not proof of injection.'})}
 for(const id of comparison.falsePositives){const p=predictions.find(p=>p.id===id);const pairReviews=reviews.filter(v=>v.predictionId===id);errors.push({kind:'FP',document:r.sourceId,section:doc.sourceChunks.find(c=>c.chunkId===p.chunkId)?.sourceLocator.headingPath.join(' / '),category:p.category,actualPrediction:id,expected:'No additional matching reference in this predeclared chunk',evidence:{chunkId:p.chunkId,start:p.start,end:p.end},sourceExtracted:true,chunkAnalyzed:r.analyzedChunks.includes(p.chunkId),evidenceRejected:false,failureType:pairReviews.some(v=>v.verdict==='CONTRADICTORY')?'INCORRECT_INTERPRETATION':'DUPLICATE_OR_REFERENCE_GAP',possibleRootCause:pairReviews.map(v=>v.rationale).join('; ')||'Unmatched draft-reference prediction; may reflect incomplete annotation, not proven false legal claim.'})}
}
const evaluated=documents.filter(d=>d.evaluated);const micro=rates(evaluated.reduce((n,d)=>n+d.metrics.tp,0),evaluated.reduce((n,d)=>n+d.metrics.fp,0),evaluated.reduce((n,d)=>n+d.metrics.fn,0));
const average=k=>{const values=evaluated.map(d=>d.metrics[k]).filter(v=>v!==null);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null};
const byCategory=CATEGORY_IDS.map(category=>({category,...evaluate(allGold.filter(g=>g.category===category),allPredictions.filter(p=>p.category===category),reviews,true).metrics}));
const totalMatches=evaluated.flatMap(d=>d.matches);
const metrics={at:new Date().toISOString(),status:'PROVISIONAL',inferenceScope:summary.config.scope,scope:'Selected predeclared reference chunks, not exhaustive contracts',reviewStatus:'PENDING_HUMAN_REVIEW',semanticReviewsApplied:reviews.length,semanticReviewsStale:inputReviews.length-reviews.length,documents,micro,macro:{precision:average('precision'),recall:average('recall'),f1:average('f1')},byCategory,severityAgreement:totalMatches.length?totalMatches.filter(m=>m.severityAgrees).length/totalMatches.length:null,evidenceValidity:rawAccepted+rawRejected?rawAccepted/(rawAccepted+rawRejected):null,rawAcceptedProposals:rawAccepted,rawRejectedProposals:rawRejected,totalModelCalls:results.reduce((n,r)=>n+r.modelCalls,0),averageDurationMs:results.length?results.reduce((n,r)=>n+r.durationMs,0)/results.length:null,modelResponseFailures:results.reduce((n,r)=>n+r.errors.length,0),invalidJsonCount:invalidJson,invalidStructuredResponseCount:invalidStructured,unevaluated:documents.filter(d=>!d.evaluated).map(d=>d.sourceId),errors};
mkdirSync('evaluation/metrics',{recursive:true});writeFileSync(process.env.CLAUSEGUARD_METRICS_OUTPUT??'evaluation/metrics/latest.json',JSON.stringify(metrics,null,2));console.log(JSON.stringify({status:metrics.status,micro,unevaluated:metrics.unevaluated}));
