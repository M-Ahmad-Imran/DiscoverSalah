import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const configPath = ts.findConfigFile('.', ts.sys.fileExists);
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
const host = {
  getScriptFileNames: () => parsed.fileNames,
  getScriptVersion: () => '0',
  getScriptSnapshot: (file) =>
    fs.existsSync(file)
      ? ts.ScriptSnapshot.fromString(fs.readFileSync(file, 'utf8'))
      : undefined,
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
};
const service = ts.createLanguageService(host);
for (const file of parsed.fileNames) {
  for (const change of service.organizeImports(
    { type: 'file', fileName: file },
    {},
    {},
  )) {
    let source = fs.readFileSync(change.fileName, 'utf8');
    for (const edit of [...change.textChanges].sort(
      (a, b) => b.span.start - a.span.start,
    )) {
      source =
        source.slice(0, edit.span.start) +
        edit.newText +
        source.slice(edit.span.start + edit.span.length);
    }
    fs.writeFileSync(path.resolve(change.fileName), source);
  }
}
service.dispose();
