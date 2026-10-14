import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { loadRisk } from './load-risk.mjs';
const risk = await loadRisk(); const goldText = readFileSync('evaluation/annotations/gold.json','utf8'); const gold = JSON.parse(goldText);
const sources = JSON.parse(readFileSync('evaluation/sources.json','utf8')); const dir = process.env.CLAUSEGUARD_EVAL_DIR ?? '.local/p4/predictions'; mkdirSync(dir,{recursive:true}); const publicDir=process.env.CLAUSEGUARD_EVAL_PUBLIC_DIR??'evaluation/predictions'; mkdirSync(publicDir,{recursive:true});
const fresh = process.argv.includes('--fresh'); const full = !process.argv.includes('--selected');
const config = { model:'qwen3.5:9b-q4_K_M', context:8192, temperature:0, output:risk.OUTPUT_TOKENS, maxOutput:risk.MAX_OUTPUT_TOKENS, providerHash:createHash("sha256").update(readFileSync("src/risk/provider.ts")).digest("hex"), schemaVersion:"risk-v1", evaluationVersion:"P4.1", schemaHash:createHash("sha256").update(readFileSync("src/risk/schema.ts")).digest("hex"), batchingHash:createHash("sha256").update(readFileSync("src/risk/batching.ts")).digest("hex"), verifierHash:createHash("sha256").update(readFileSync("src/risk/evidence.ts")).digest("hex"), scope:full?'full-document':'predeclared-reference-batches', promptHash:createHash('sha256').update(risk.RISK_SYSTEM_PROMPT).digest('hex'), goldHash:createHash('sha256').update(goldText).digest('hex') };
const runStamp=Date.now(), journal=`${dir}/network-${runStamp}.ndjson`, gpuJournal=`${dir}/gpu-${runStamp}.ndjson`;
const resumeIndex=process.argv.indexOf('--resume');const resume=resumeIndex>=0?readFileSync(process.argv[resumeIndex+1],'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
const requestHash=body=>createHash('sha256').update(JSON.stringify(body)).digest('hex');
const cachedResponses=new Map();for(const entry of resume){try{risk.decodeRiskResponse(entry.response,entry.wallMs,entry.request.options.num_predict);cachedResponses.set(requestHash(entry.request),entry)}catch{/* Failed responses stay in the original journal, never synthesized or repaired. */}}
const network = [], samples = [], results = []; let sampling=false;
const sample = async () => { if(sampling)return; sampling=true; try { const item={at:new Date().toISOString(),gpu:execFileSync('nvidia-smi',['--query-gpu=memory.used,memory.total,utilization.gpu','--format=csv,noheader,nounits'],{encoding:'utf8',timeout:5000}).trim(),processor:execFileSync(resolve('.local/ollama/ollama.exe'),['ps'],{encoding:'utf8',timeout:5000}).trim(),resident:await(await fetch('http://127.0.0.1:11434/api/ps',{signal:AbortSignal.timeout(5000)})).json()};samples.push(item);appendFileSync(gpuJournal,JSON.stringify(item)+'\n'); }catch(e){const item={error:String(e)};samples.push(item);appendFileSync(gpuJournal,JSON.stringify(item)+'\n')}finally{sampling=false} };
const fetcher=async(url,init)=>{ const started=performance.now();const r=await fetch(url,init); if(String(url).endsWith('/api/chat')){const item={at:new Date().toISOString(),provenance:'FRESH',request:JSON.parse(init.body),status:r.status,response:await r.clone().json(),wallMs:performance.now()-started};network.push(item);appendFileSync(journal,JSON.stringify(item)+'\n')}return r; };
const request=async(batch,signal)=>{const cached=cachedResponses.get(requestHash(risk.buildRiskRequest(batch)));if(!cached)return risk.requestRiskBatch(batch,signal,fetcher);const item={...cached,provenance:'CACHED',originalJournal:process.argv[resumeIndex+1]};network.push(item);appendFileSync(journal,JSON.stringify(item)+'\n');return risk.decodeRiskResponse(cached.response,cached.wallMs,cached.request.options.num_predict)};
const needsInference=fresh||sources.some(s=>{const base=`${s.id}-${config.promptHash.slice(0,12)}-${full?'full':'selected'}.json`;return !readdirSync(dir).some(p=>p===base||p.startsWith(`${base}.`))});
let timer;if(needsInference){await risk.prepareGpuModel();await sample();timer=setInterval(()=>void sample(),1000)}
try { for(const s of sources){
  const path=`${dir}/${s.id}-${config.promptHash.slice(0,12)}-${full?'full':'selected'}.json`;
  const document=JSON.parse(readFileSync(`.local/p4/real/${s.id}.json`,'utf8'));
  if(!await risk.verifyDocumentIntegrity(document))throw new Error('Immutable source invalid');
  if(document.documentId!==s.documentId||document.contentHash!==s.documentHash)throw new Error('Source differs from frozen official snapshot; evaluation refused');
  const base=path.slice(dir.length+1);const latestCache=readdirSync(dir).filter(p=>p===base||p.startsWith(`${base}.`)).map(p=>`${dir}/${p}`).sort((a,b)=>statSync(b).mtimeMs-statSync(a).mtimeMs)[0];
  if(latestCache&&!fresh){const cached=JSON.parse(readFileSync(latestCache,'utf8'));if(JSON.stringify(cached.config)!==JSON.stringify(config)||cached.documentHash!==document.contentHash||cached.documentId!==document.documentId)throw new Error('Frozen reference/source version changed; cached predictions cannot be reused');results.push({...cached,provenance:'CACHED',cachePath:latestCache});continue;}
  const prepared=risk.prepareBatches(document);const ids=new Set(gold.labels.filter(g=>g.documentId===document.documentId).map(g=>g.chunkId));
  const selected=full?prepared.batches:prepared.batches.filter(b=>b.primaryChunkIds.some(id=>ids.has(id)));
  const findings=[],rejected=[],timings=[],errors=[],analyzed=new Set();const started=performance.now();const first=network.length;
  let report;
  if(full)report=await risk.analyzeDocument(document,{request,timeoutMs:3_600_000,onProgress:async report=>{
    writeFileSync(`${dir}/${s.id}-inflight.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify({id:s.id,completed:report.coverage.batches.filter(b=>b.status==='COMPLETE').length,failed:report.coverage.batches.filter(b=>b.status==='FAILED').length,total:report.coverage.batches.length}));
  }});
  else for(const batch of selected){try{
    const response=await request(batch,new AbortController().signal);timings.push(response.timing);
    for(const p of response.proposal.findings){const v=await risk.verifyFinding(document,p,document.contentHash,new Set(batch.chunks.map(c=>c.chunkId)));if(v.accepted)findings.push(v.accepted);if(v.rejected)rejected.push(v.rejected);}
    batch.primaryChunkIds.forEach(id=>analyzed.add(id));
  }catch(error){errors.push({batchId:batch.batchId,error:String(error),classification:'MODEL_RESPONSE_FAILURE'});}}
  if(report)errors.push(...report.coverage.batches.flatMap(b=>b.errors.map(error=>({batchId:b.batchId,error,classification:'MODEL_RESPONSE_FAILURE'}))));
  const result={sourceId:s.id,documentId:document.documentId,documentHash:document.contentHash,config,provenance:'FRESH',at:new Date().toISOString(),extractionCoverage:document.extraction.status,totalChunks:document.sourceChunks.length,totalAvailableBatches:prepared.batches.length,selectedBatches:selected.length,analyzedChunks:report?.coverage.analyzedChunks??[...analyzed],unbatchable:prepared.unbatchable,findings:report?.findings??risk.deduplicateFindings(findings),rejected:report?.rejectedFindings??rejected,timings:report?report.coverage.batches.flatMap(b=>b.timings):timings,errors,modelCalls:network.length-first,durationMs:performance.now()-started,score:report?.score??null,scoreWithheldReason:report?.scoreWithheldReason??'Selected-clause evaluation / incomplete extraction; no complete-document score',...(report?{report}:{} )};
  let acceptedProposals=0,rejectedProposals=0,invalidStructuredResponses=0;
  for(const call of network.slice(first)){
    let decoded;try{decoded=risk.decodeRiskResponse(call.response,0,call.request.options.num_predict)}catch{invalidStructuredResponses++;continue}
    const ids=new Set(JSON.parse(call.request.messages[1].content).sourceData.map(c=>c.sourceChunkId));
    for(const p of decoded.proposal.findings){const v=await risk.verifyFinding(document,p,document.contentHash,ids);if(v.accepted)acceptedProposals++;if(v.rejected)rejectedProposals++;}
  }
  Object.assign(result,{acceptedProposalCount:acceptedProposals,rejectedProposalCount:rejectedProposals,invalidStructuredResponseCount:invalidStructuredResponses});
  Object.assign(result,{freshModelCalls:network.slice(first).filter(n=>n.provenance==='FRESH').length,cachedModelCalls:network.slice(first).filter(n=>n.provenance==='CACHED').length,nativeJournal:journal});
  Object.assign(result,{provenance:result.cachedModelCalls?(result.freshModelCalls?'MIXED':'CACHED'):'FRESH',nativeWallMs:network.slice(first).reduce((n,r)=>n+(r.wallMs??0),0)});
  const immutablePath=existsSync(path)?`${path}.${Date.now()}.json`:path;writeFileSync(immutablePath,JSON.stringify(result,null,2));results.push({...result,cachePath:immutablePath});console.log(JSON.stringify({id:s.id,batches:result.selectedBatches,calls:result.modelCalls,accepted:result.findings.length,rejected:result.rejected.length,errors:result.errors.length}));
}}finally{if(timer)clearInterval(timer);if(needsInference)await sample();}
const stamp=Date.now();writeFileSync(`${dir}/network-${stamp}.json`,JSON.stringify(network,null,2));writeFileSync(`${dir}/gpu-${stamp}.json`,JSON.stringify(samples,null,2));
writeFileSync(`${dir}/latest.json`,JSON.stringify(results,null,2));
const loaded=samples.filter(s=>s.processor?.includes(config.model));const summary={at:new Date().toISOString(),config,freshCalls:network.filter(n=>n.provenance==='FRESH').length,replayedCalls:network.filter(n=>n.provenance==='CACHED').length,cachedDocuments:results.filter(r=>r.provenance==='CACHED').length,privateNetwork:`${dir}/network-${stamp}.json`,privateGpu:`${dir}/gpu-${stamp}.json`,gpu:{samples:loaded.length,fullGpu:loaded.length>1&&loaded.every(s=>/100% GPU/.test(s.processor)&&s.resident.models.some(m=>m.name===config.model&&m.context_length===8192&&m.size_vram>=m.size&&Number(s.gpu.split(',')[0])>=m.size_vram/1048576-256)),peakVramMiB:Math.max(...loaded.map(s=>Number(s.gpu.split(',')[0]))),peakCompute:Math.max(...loaded.map(s=>Number(s.gpu.split(',')[2])))},documents:results.map(({findings,rejected,timings,report,...r})=>({...r,accepted:findings.length,rejected:rejected.length,promptTokens:timings.reduce((n,t)=>n+t.promptTokens,0),generatedTokens:timings.reduce((n,t)=>n+t.generatedTokens,0),generationMs:timings.reduce((n,t)=>n+t.generationMs,0)}))};
writeFileSync(`${publicDir}/run-${stamp}.json`,JSON.stringify(summary,null,2));writeFileSync(`${publicDir}/latest.json`,JSON.stringify(summary,null,2));
if(results.some(r=>r.errors.length))process.exitCode=1;
