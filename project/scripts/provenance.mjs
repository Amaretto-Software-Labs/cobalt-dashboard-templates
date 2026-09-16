import { mkdtemp, mkdir, readFile, writeFile, readdir, lstat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
export const sourceRoots = ['package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','manifest.json','datasets.json','AGENTS.md','src','ui','sdk','scripts'];
export async function sourceFiles(root) {
  const files = {};
  async function visit(path) {
    const stat = await lstat(join(root,path));
    if (stat.isSymbolicLink()) throw new Error('Symlinks cannot be saved: '+path);
    if (stat.isDirectory()) { for(const name of await readdir(join(root,path))) { if(name.startsWith('.') || name==='node_modules') throw new Error('Hidden files and dependencies cannot be saved'); await visit(path+'/'+name); } }
    else { const value=await readFile(join(root,path),'utf8');if(Buffer.byteLength(value)>1_000_000)throw new Error('Source file too large');files[path]=value; }
  }
  for(const path of sourceRoots) await visit(path);
  return files;
}
export async function writeTree(root, files) {
  for(const [path,content] of Object.entries(files)) {
    if(path.startsWith('/') || path.includes('\\') || path.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('.'))) throw new Error('Invalid source path');
    await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),content);
  }
}
export function git(root,...args) { return execFileSync('git',['-c','user.name=Cobalt Dashboard','-c','user.email=dashboard@cobalt.local',...args],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}); }
export async function saveDiff(root) {
  const baseline=JSON.parse(await readFile(join(root,'template-base.json'),'utf8'));
  const provenance=JSON.parse(await readFile(join(root,'provenance.json'),'utf8'));
  if(!/^[a-f0-9]{40}$/.test(provenance.startingSha) || baseline.startingSha!==provenance.startingSha) throw new Error('Template baseline and starting SHA do not match');
  const current=await sourceFiles(root);
  const temp=await mkdtemp(join(tmpdir(),'cobalt-dashboard-diff-'));
  try {
    git(temp,'init','-q');await writeTree(temp,baseline.files);git(temp,'add','-A');git(temp,'commit','-qm','Template baseline');
    for(const path of Object.keys(baseline.files)) if(!(path in current)) await rm(join(temp,path),{force:true});
    await writeTree(temp,current);git(temp,'add','-A');
    await writeFile(join(root,'changes.patch'),git(temp,'diff','--cached','--binary','--full-index','HEAD'));
  } finally { await rm(temp,{recursive:true,force:true}); }
}
