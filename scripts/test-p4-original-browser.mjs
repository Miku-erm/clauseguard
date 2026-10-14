import { browserExecutable } from './lib/browser.mjs';
import{chromium}from'playwright-core';import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{resolve}from'node:path';import{randomUUID}from'node:crypto';import{once}from'node:events';import{startFixture}from'./serve-fixture.mjs';
import{archiveEvidence}from'./archive-evidence.mjs';
const dir='docs/evidence/p4/original-final';archiveEvidence(dir,['result.json','network.json']);mkdirSync(dir,{recursive:true});let server,context;const traffic=[],tasks=[];let result;
try{
 try{await fetch('http://127.0.0.1:4173/p2/injection.html',{signal:AbortSignal.timeout(1000)})}catch{server=startFixture();await once(server,'listening')}
 const executable=browserExecutable();const extension=resolve('.output/chrome-mv3');context=await chromium.launchPersistentContext(resolve(`.local/p4-original-${randomUUID()}`),{executablePath:executable,channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--disable-gpu','--disable-background-networking','--disable-component-update']});
 context.on('response',r=>{if(r.url().endsWith('/api/chat'))tasks.push(r.json().then(body=>traffic.push({request:r.request().postDataJSON(),response:body})).catch(e=>traffic.push({error:String(e)})))});
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;const page=await context.newPage();await page.goto('http://127.0.0.1:4173/p2/injection.html');const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);await page.bringToFront();await popup.reload();
 await popup.getByRole('button',{name:'Belgeyi Tara',exact:true}).click();await popup.getByRole('button',{name:'Risk Analizi Yap',exact:true}).waitFor();
 const button=popup.getByRole('button',{name:'Risk Analizi Yap',exact:true});await button.click();const t=performance.now();
 while(performance.now()-t<180000){result=await popup.evaluate(async()=>(await chrome.storage.session.get('lastAnalysis')).lastAnalysis);if(['FINISHED','FAILED','INTERRUPTED'].includes(result?.status))break;await new Promise(r=>setTimeout(r,150))}
 if(!result?.report?.findings.some(f=>f.category==='AUTOMATIC_RENEWAL'))throw new Error('Injection hid the source-backed renewal finding');
 writeFileSync(`${dir}/result.json`,JSON.stringify({status:'PASS',at:new Date().toISOString(),result},null,2));
}catch(e){writeFileSync(`${dir}/result.json`,JSON.stringify({status:'FAIL',at:new Date().toISOString(),error:String(e),result},null,2));process.exitCode=1}
finally{await Promise.allSettled(tasks);writeFileSync(`${dir}/network.json`,JSON.stringify(traffic,null,2));await context?.close();server?.close()}
