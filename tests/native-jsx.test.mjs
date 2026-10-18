import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// JSX preserves spaces between adjacent tags on one line. Native View and
// ScrollView reject even whitespace-only text children; browsers accept them.
function renderedText(text) {
  const lines=text.split(/\r\n|\n|\r/);let lastNonempty=0;
  lines.forEach((line,index)=>{if(/[^ \t]/.test(line))lastNonempty=index;});
  return lines.map((line,index)=>{
    let value=line.replace(/\t/g,' ');
    if(index!==0)value=value.replace(/^ +/,'');
    if(index!==lines.length-1)value=value.replace(/ +$/,'');
    return value+(value&&index!==lastNonempty?' ':'');
  }).join('');
}
function containerText(source) {
  const tree=ts.createSourceFile('native.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const violations=[];
  function visit(node) {
    if(ts.isJsxText(node)&&renderedText(node.text)) {
      let parent=node.parent;
      while(parent&&!ts.isJsxElement(parent))parent=parent.parent;
      if(parent&&parent.openingElement.tagName.getText(tree)!=='Text')violations.push(tree.getLineAndCharacterOfPosition(node.pos).line+1);
    }
    ts.forEachChild(node,visit);
  }
  visit(tree);return violations;
}
test('native JSX regression check catches spaces that a browser silently accepts',()=>{
  assert.equal(containerText('<View><View/> <Text>Label</Text></View>').length,1);
  assert.equal(containerText('<View><View/>\n <Text>Label</Text></View>').length,0);
});
test('Add sheet has no raw text or same-line spaces inside native containers',()=>{
  assert.deepEqual(containerText(readFileSync(new URL('../src/components/AddPreview.tsx',import.meta.url),'utf8')),[]);
});
