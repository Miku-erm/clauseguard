import{spawnSync}from'node:child_process';import{writeFileSync,mkdirSync}from'node:fs';
mkdirSync('docs/evidence/p4',{recursive:true});const results=[];
for(const [name,command]of[['typecheck','npm run typecheck'],['unit','npm test'],['build','npm run build']]){
 const start=performance.now();const r=spawnSync('powershell.exe',['-NoProfile','-Command',`${command}; exit $LASTEXITCODE`],{encoding:'utf8',env:process.env});
 writeFileSync(`docs/evidence/p4-${name}-run.log`,(r.stdout??'')+(r.stderr??''));results.push({name,command,at:new Date().toISOString(),exitCode:r.status,error:r.error?String(r.error):null,durationMs:performance.now()-start});
}
writeFileSync('docs/evidence/p4/build-exits.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));if(results.some(r=>r.exitCode!==0))process.exitCode=1;
