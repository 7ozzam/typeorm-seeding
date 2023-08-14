import glob from 'glob';
import * as path from 'path';

export const importFiles = async (filePaths: string[]) => {
  await Promise.all(filePaths.map((filePath) => import(filePath)));
}

export const loadFiles = (filePatternsAndPaths: string[]): string[] => {
  return filePatternsAndPaths
    .map((patternOrPath) => {
      if (patternOrPath.includes('*') || patternOrPath.includes('?')) {
        // If the entry contains '*' or '?' characters, it's a pattern
        return glob.sync(path.resolve(process.cwd(), patternOrPath));
      } else {
        // Otherwise, treat it as a specific file path
        return [path.resolve(process.cwd(), patternOrPath)];
      }
    })
    .reduce((acc, filePaths) => acc.concat(filePaths), []);
}
