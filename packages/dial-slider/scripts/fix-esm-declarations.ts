import { extname } from 'node:path';

const declarationRoot = `${import.meta.dir}/../lib/typescript/module`;
const declarationFiles = new Bun.Glob('**/*.d.ts');
const relativeFrom = /(\bfrom\s+['"])(\.{1,2}\/[^'"]+)(['"])/g;
const relativeImport = /(\bimport\s*\(\s*['"])(\.{1,2}\/[^'"]+)(['"]\s*\))/g;

function addJavaScriptExtension(specifier: string) {
  return extname(specifier) === '' ? `${specifier}.js` : specifier;
}

let changedFiles = 0;

for await (const relativePath of declarationFiles.scan({
  cwd: declarationRoot,
  onlyFiles: true,
})) {
  const path = `${declarationRoot}/${relativePath}`;
  const source = await Bun.file(path).text();
  const output = source
    .replace(relativeFrom, (_, prefix, specifier, suffix) =>
      [prefix, addJavaScriptExtension(specifier), suffix].join('')
    )
    .replace(relativeImport, (_, prefix, specifier, suffix) =>
      [prefix, addJavaScriptExtension(specifier), suffix].join('')
    );

  if (output !== source) {
    await Bun.write(path, output);
    changedFiles += 1;
  }
}

console.log(`Patched ${changedFiles} ESM declaration file(s).`);
