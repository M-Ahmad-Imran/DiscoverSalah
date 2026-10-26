import ts from 'typescript'; import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve('src');
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.tsx'))files.push(p);}}walk(root);
const skip=new Set(['Discover','Salah','DiscoverSalah','DISCOVERSALAH','v','· v','+92 3XX XXXXXXX']);
for(const file of files){let source=fs.readFileSync(file,'utf8');let sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];
function add(start,end,text){if(edits.some(e=>start<e.end&&end>e.start))return;edits.push({start,end,text});}
function visit(n){
 if(ts.isJsxText(n)&&/[A-Za-z]/.test(n.text)){const text=n.text.replace(/\s+/g,' ').trim();if(text&&!skip.has(text))add(n.pos,n.end,`{tr(${JSON.stringify(text)})}${/\s$/.test(n.text)?"{' '}":''}`);}
 if(ts.isJsxAttribute(n)&&['label','title','description','placeholder','aria-label','alt'].includes(n.name.getText(sf))&&n.initializer&&ts.isStringLiteral(n.initializer)&&!skip.has(n.initializer.text))add(n.initializer.getStart(sf),n.initializer.end,`{tr(${JSON.stringify(n.initializer.text)})}`);
 if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(sf)==='option'){
  const child=n.children.find(x=>!(ts.isJsxText(x)&&!x.text.trim()));
  if(child&&!n.openingElement.attributes.properties.some(x=>ts.isJsxAttribute(x)&&x.name.getText(sf)==='value')){
   const value=ts.isJsxText(child)?JSON.stringify(child.text.trim()):ts.isJsxExpression(child)&&child.expression?child.expression.getText(sf):null;
   if(value)add(n.openingElement.end-1,n.openingElement.end-1,` value={${value}}`);
  }
  if(child&&ts.isJsxExpression(child)&&child.expression&&ts.isIdentifier(child.expression))add(child.expression.getStart(sf),child.expression.end,`tr(${child.expression.getText(sf)})`);
 }
 if(ts.isJsxExpression(n)&&n.expression){const e=n.expression;
  if(ts.isConditionalExpression(e))for(const part of [e.whenTrue,e.whenFalse])if(ts.isStringLiteral(part)&&/[A-Za-z]/.test(part.text)&&!skip.has(part.text))add(part.getStart(sf),part.end,`tr(${JSON.stringify(part.text)})`);
  if(ts.isPropertyAccessExpression(e)&&['status','state','category','prayer','type','action'].includes(e.name.text))add(e.getStart(sf),e.end,`tr(${e.getText(sf)})`);
  if(ts.isElementAccessExpression(e)&&e.expression.getText(sf)==='roleNames')add(e.getStart(sf),e.end,`tr(${e.getText(sf)})`);
 }
 ts.forEachChild(n,visit);
}visit(sf);
if(!edits.length)continue;
for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);
let rel=path.relative(path.dirname(file),path.join(root,'i18n/translate')).replaceAll('\\','/');if(!rel.startsWith('.'))rel='./'+rel;
if(!source.includes("from '"+rel+"'"))source=`import { tr } from '${rel}';\n`+source;
// Subscribe otherwise-static components to locale changes without hooks in translation helpers.
if(!source.includes('useApp(')&&!file.endsWith(path.join('app','App.tsx'))&&!file.endsWith('AppProvider.tsx')){
 const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const insert=[];
 for(const node of parsed.statements)if(ts.isFunctionDeclaration(node)&&node.name&&/^[A-Z]/.test(node.name.text)&&node.body)insert.push(node.body.getStart(parsed)+1);
 if(insert.length){for(const pos of insert.reverse())source=source.slice(0,pos)+'\n  useApp();'+source.slice(pos);let hook=path.relative(path.dirname(file),path.join(root,'hooks/useApp')).replaceAll('\\','/');if(!hook.startsWith('.'))hook='./'+hook;source=`import { useApp } from '${hook}';\n`+source;}
}
fs.writeFileSync(file,source);
}
