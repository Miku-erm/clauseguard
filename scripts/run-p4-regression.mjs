import{spawnSync}from'node:child_process';import{writeFileSync,mkdirSync}from'node:fs';
const env={...process.env,CLAUSEGUARD_P3_EVIDENCE_DIR:'docs/evidence/p4/regression-p3',CLAUSEGUARD_P2_BROWSER_EVIDENCE_DIR:'docs/evidence/p4/regression-p2',CLAUSEGUARD_P1_EVIDENCE_DIR:'docs/evidence/p4/regression-p1',CLAUSEGUARD_EVIDENCE_DIR:'docs/evidence/p4/regression-p0.1',CLAUSEGUARD_ATTEMPTS:'3'};
const results=[];mkdirSync('docs/evidence/p4',{recursive:true});
for(const script of ['scripts/test-p4-semantics.mjs','scripts/test-p4-original-browser.mjs','scripts/run-browser-suite.mjs']){
 const start=performance.now();const r=script==='scripts/run-browser-suite.mjs'?spawnSync('powershell.exe',['-NoProfile','-Command','npm run test:browser; exit $LASTEXITCODE'],{env,stdio:'inherit'}):spawnSync(process.execPath,[script],{env,stdio:'inherit'});results.push({script,command:script==='scripts/run-browser-suite.mjs'?'npm run test:browser':`node ${script}`,at:new Date().toISOString(),exitCode:r.status,error:r.error?String(r.error):null,durationMs:performance.now()-start});writeFileSync('docs/evidence/p4/regression-exits.json',JSON.stringify(results,null,2));
}
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
