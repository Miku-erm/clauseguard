import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{loadRisk}from'./load-risk.mjs';
const file=process.argv[2];if(!file)throw new Error('Pass an existing actual native NDJSON journal');
const risk=await loadRisk();const calls=readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
const fingerprint=r=>createHash('sha256').update(JSON.stringify(r)).digest('hex');const valid=new Map();let invalid=0;
for(const call of calls){try{risk.decodeRiskResponse(call.response,call.wallMs);valid.set(fingerprint(call.request),call)}catch{invalid++}}
const doc=JSON.parse(readFileSync('.local/p4/real/github.json','utf8'));const batches=risk.prepareBatches(doc).batches;
const matches=batches.filter(b=>valid.has(fingerprint(risk.buildRiskRequest(b))));if(!matches.length)throw new Error('No actual recorded request matched the current source/configuration');
const original=risk.buildRiskRequest(matches[0]);const changes=[{...original,model:'unauthorized'}, {...original,options:{...original.options,num_ctx:4096}}, {...original,messages:[...original.messages.slice(0,1),{role:'user',content:original.messages[1].content+' changed source'}]}];
if(changes.some(r=>valid.has(fingerprint(r))))throw new Error('Cache reused changed source/model/context');
const result={at:new Date().toISOString(),status:'PASS',provenance:'Deterministic validation of preserved actual native responses; zero new model requests',journal:file,totalRecords:calls.length,invalidRecordsNotReused:invalid,currentGithubRequestMatches:matches.length,changedSourceModelContextRejected:changes.length,preservesOriginalWallAndNativeTiming:true};
writeFileSync('docs/evidence/p4/cache-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
