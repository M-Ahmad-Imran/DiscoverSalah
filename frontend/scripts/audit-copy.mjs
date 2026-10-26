import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('src');
const report = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) {
      const text = fs.readFileSync(p, 'utf8');
      const sf = ts.createSourceFile(
        p,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(n) {
        let value, kind;
        if (ts.isJsxText(n) && /[A-Za-z]/.test(n.text)) {
          value = n.text.replace(/\s+/g, ' ').trim();
          kind = 'text';
        }
        if (
          ts.isJsxAttribute(n) &&
          ['label', 'title', 'description', 'placeholder', 'aria-label', 'alt'].includes(
            n.name.getText(sf),
          ) &&
          n.initializer &&
          ts.isStringLiteral(n.initializer)
        ) {
          value = n.initializer.text;
          kind = 'attribute';
        }
        if (
          ts.isCallExpression(n) &&
          n.expression.getText(sf) === 't' &&
          n.arguments[0] &&
          ts.isStringLiteral(n.arguments[0])
        ) {
          value = n.arguments.map((a) =>
            ts.isStringLiteral(a) ? a.text : a.getText(sf),
          );
          kind = 'translated';
        }
        if (value)
          report.push({
            file: path.relative(root, p),
            line: sf.getLineAndCharacterOfPosition(n.pos).line + 1,
            kind,
            value,
          });
        ts.forEachChild(n, visit);
      }
      visit(sf);
    }
  }
}
walk(root);
fs.writeFileSync(
  '../.project-reference/urdu-copy-audit.json',
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    translated: report.filter((x) => x.kind === 'translated').length,
    untranslated: report.filter((x) => x.kind !== 'translated').length,
  }),
);
console.log(
  JSON.stringify(
    report.filter((x) => x.kind !== 'translated'),
    null,
    2,
  ),
);
