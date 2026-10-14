import {spawnSync} from 'node:child_process';
const selected=process.argv.includes('--selected');
const scope=selected?'candidate':'final';
const env={...process.env,CLAUSEGUARD_EVAL_DIR:`.local/p4.1/${scope}`,CLAUSEGUARD_EVAL_PUBLIC_DIR:`evaluation/p4.1/${scope}`};
const result=spawnSync(process.execPath,['scripts/eval-real.mjs',...process.argv.slice(2)],{env,stdio:'inherit'});
if(result.error)throw result.error;process.exitCode=result.status??1;
