import{existsSync,mkdirSync,copyFileSync}from'node:fs';
import{join}from'node:path';
export function archiveEvidence(directory,names){
 const existing=names.filter(name=>existsSync(join(directory,name)));if(!existing.length)return;
 const archive=join(directory,'history',`${Date.now()}`);mkdirSync(archive,{recursive:true});
 for(const name of existing)copyFileSync(join(directory,name),join(archive,name));
}
