import {readFileSync,writeFileSync,mkdirSync}from'node:fs';import{JSDOM}from'jsdom';import{loadRisk}from'./load-risk.mjs';
import{archiveEvidence}from'./archive-evidence.mjs';
const risk=await loadRisk();const dir=process.env.CLAUSEGUARD_P4_SEMANTIC_DIR??'docs/evidence/p4/repeatability';archiveEvidence(dir,['summary.json','results.json','network.json']);mkdirSync(dir,{recursive:true});const results=[],network=[];
const cases=[
 {id:'original-p3',html:readFileSync('fixtures/p2/injection.html','utf8'),url:'http://127.0.0.1:4173/p2/injection.html',expected:['AUTOMATIC_RENEWAL'],allowed:['AUTOMATIC_RENEWAL','DIFFICULT_CANCELLATION_OR_REFUND'],repeats:3},
 {id:'negated',text:'Subscriptions never renew automatically. We do not sell personal data. Cancellation is available online at any time.',expected:[],allowed:[],repeats:2},
 {id:'qualified',text:'Subscriptions renew automatically with a reminder thirty days beforehand. You may cancel online at any time before renewal without fees.',expected:[],allowed:[],repeats:2},
 {id:'contradiction',text:'We do not share identifiable data with advertisers. The next clause applies only after freely revocable opt-in consent: we share advertising identifiers with selected advertisers.',expected:[],allowed:[],repeats:1},
 {id:'ambiguous-retention',text:'We store personal data for a reasonable period based on unspecified operational needs.',expected:[],allowed:[],unresolved:true,repeats:3},
];
await risk.prepareGpuModel();
const fetcher=async(url,init)=>{const r=await fetch(url,init);if(String(url).endsWith('/api/chat'))network.push({request:JSON.parse(init.body),response:await r.clone().json()});return r};
for(const c of cases)for(let attempt=1;attempt<=c.repeats;attempt++){
 const dom=new JSDOM(c.html??`<title>Subscription Terms</title><main><h1>Subscription Terms</h1><p>${c.text}</p></main>`,{url:c.url??`https://fictional.test/${c.id}`});const doc=(await risk.extractDocuments(dom.window.document)).documents[0];
 const report=await risk.analyzeDocument(doc,{request:(b,s)=>risk.requestRiskBatch(b,s,fetcher)});const cats=report.findings.map(f=>f.category);const missed=c.expected.filter(k=>!cats.includes(k));const unexpected=cats.filter(k=>!c.allowed.includes(k));
 const pass=!missed.length&&!unexpected.length&&!report.rejectedFindingCount&&(c.unresolved?report.unresolvedIssues.length>0:report.unresolvedIssues.length===0);
 results.push({id:c.id,attempt,pass,missed,unexpected,report,signature:report.findings.map(f=>({category:f.category,quote:f.quote,severity:f.severity})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});writeFileSync(`${dir}/results.json`,JSON.stringify(results,null,2));writeFileSync(`${dir}/network.json`,JSON.stringify(network,null,2));console.log(JSON.stringify({id:c.id,attempt,pass,missed,unexpected,rejected:report.rejectedFindingCount}));dom.window.close();
}
const consistency=cases.filter(c=>c.repeats>1).map(c=>{const repeats=results.filter(r=>r.id===c.id);return{id:c.id,repeats:repeats.length,uniqueCategorySets:new Set(repeats.map(r=>JSON.stringify(r.signature.map(f=>f.category)))).size,uniqueEvidenceSets:new Set(repeats.map(r=>JSON.stringify(r.signature.map(f=>f.quote)))).size,uniqueSeveritySets:new Set(repeats.map(r=>JSON.stringify(r.signature.map(f=>f.severity)))).size,totalDurationMs:repeats.reduce((n,r)=>n+r.report.durationMs,0)}});
writeFileSync(`${dir}/summary.json`,JSON.stringify({at:new Date().toISOString(),status:results.every(r=>r.pass)?'PASS':'DEGRADED',model:'qwen3.5:9b-q4_K_M',context:8192,temperature:0,consistency,calls:network.length,failed:results.filter(r=>!r.pass).map(r=>({id:r.id,attempt:r.attempt,missed:r.missed,unexpected:r.unexpected})),schemaValid:network.filter(n=>{try{return risk.proposedResponseSchema.safeParse(JSON.parse(n.response.message.content)).success}catch{return false}}).length},null,2));if(results.some(r=>!r.pass))process.exitCode=1;
