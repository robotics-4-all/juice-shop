import fs from 'fs/promises'
import path from 'path'

export const SNIPPET_PATHS = Object.freeze(['./server.ts', './routes', './lib', './data', './data/static/web3-snippets', './frontend/src/app', './models'])

interface FileMatch {
  path: string
  content: string
}

interface CachedCodeChallenge {
  snippet: string
  vulnLines: number[]
  neutralLines: number[]
}

export const findFilesWithCodeChallenges = async (
  paths: readonly string[],
  baseDir: string = process.cwd() // Base directory to restrict traversal
): Promise<FileMatch[]> => {
  const matches: FileMatch[] = [];

  // Helper function to validate paths
  const isSafePath = (targetPath: string, baseDir: string): boolean => {
    const resolvedPath = path.resolve(baseDir, targetPath);
    return resolvedPath.startsWith(baseDir); // Ensure the path stays within baseDir
  };

  const processPath = async (currPath: string): Promise<void> => {
    if (!isSafePath(currPath, baseDir)) {
      throw new Error(`Path traversal detected: ${currPath}`);
    }

    try {
      const stats = await fs.lstat(currPath);
      if (stats.isDirectory()) {
        const files = await fs.readdir(currPath);
        const fullPaths = files.map((file) => path.resolve(currPath, file));
        await Promise.all(fullPaths.map(processPath)); // Process files concurrently
      } else {
        const code = await fs.readFile(currPath, 'utf8');
        if (
          code.includes('// vuln-code-snippet start') || // Match JavaScript-like comments
          code.includes('# vuln-code-snippet start')    // Match Python-like comments
        ) {
          matches.push({ path: currPath, content: code });
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        console.warn(`File ${currPath} could not be read: ${e.message}`);
      } else {
        console.warn(`File ${currPath} could not be read: Unknown error`);
      }
    }
  };

  // Process all initial paths concurrently
  await Promise.all(paths.map(processPath));
  return matches;
}

function getCodeChallengesFromFile (file: FileMatch) {
  const fileContent = file.content

  // get all challenges which are in the file by a regex capture group
  const challengeKeyRegex = /[/#]{0,2} vuln-code-snippet start (?<challenges>.*)/g
  const challenges = [...fileContent.matchAll(challengeKeyRegex)]
    .flatMap(match => match.groups?.challenges?.split(' ') ?? [])
    .filter(Boolean)

  return challenges.map((challengeKey) => getCodingChallengeFromFileContent(fileContent, challengeKey))
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex characters
}

function getCodingChallengeFromFileContent(source: string, challengeKey: string) {
  // Escape challengeKey to prevent ReDoS attacks
  const safeChallengeKey = escapeRegExp(challengeKey);

  // Use sanitized challengeKey in regex patterns
  const snippets = source.match(
    new RegExp(
      `[/#]{0,2} vuln-code-snippet start.*${safeChallengeKey}([^])*vuln-code-snippet end.*${safeChallengeKey}`,
      'g'
    )
  );

  if (snippets == null) {
    throw new BrokenBoundary('Broken code snippet boundaries for: ' + challengeKey);
  }

  let snippet = snippets[0]; // Currently only a single code snippet is supported
  snippet = snippet.replace(new RegExp(`\\s?[/#]{0,2} vuln-code-snippet start.*[\\r\\n]{0,2}`, 'g'), '');
  snippet = snippet.replace(new RegExp(`\\s?[/#]{0,2} vuln-code-snippet end.*`, 'g'), '');
  snippet = snippet.replace(new RegExp(`.*[/#]{0,2} vuln-code-snippet hide-line[\\r\\n]{0,2}`, 'g'), '');
  snippet = snippet.replace(
    new RegExp(`.*[/#]{0,2} vuln-code-snippet hide-start([^])*[/#]{0,2} vuln-code-snippet hide-end[\\r\\n]{0,2}`, 'g'),
    ''
  );

  snippet = snippet.trim();

  let lines = snippet.split('\r\n');
  if (lines.length === 1) lines = snippet.split('\n');
  if (lines.length === 1) lines = snippet.split('\r');

  const vulnLines: number[] = [];
  const neutralLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(`vuln-code-snippet vuln-line.*${safeChallengeKey}`).exec(lines[i])) {
      vulnLines.push(i + 1);
    } else if (new RegExp(`vuln-code-snippet neutral-line.*${safeChallengeKey}`).exec(lines[i])) {
      neutralLines.push(i + 1);
    }
  }

  snippet = snippet.replace(new RegExp(`\\s?[/#]{0,2} vuln-code-snippet vuln-line.*`, 'g'), '');
  snippet = snippet.replace(new RegExp(`\\s?[/#]{0,2} vuln-code-snippet neutral-line.*`, 'g'), '');

  return { challengeKey, snippet, vulnLines, neutralLines };
}

class BrokenBoundary extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'BrokenBoundary'
    this.message = message
  }
}

// dont use directly, use getCodeChallenges getter
let _internalCodeChallenges: Map<string, CachedCodeChallenge> | null = null
export async function getCodeChallenges (): Promise<Map<string, CachedCodeChallenge>> {
  if (_internalCodeChallenges === null) {
    _internalCodeChallenges = new Map<string, CachedCodeChallenge>()
    const filesWithCodeChallenges = await findFilesWithCodeChallenges(SNIPPET_PATHS)
    for (const fileMatch of filesWithCodeChallenges) {
      for (const codeChallenge of getCodeChallengesFromFile(fileMatch)) {
        _internalCodeChallenges.set(codeChallenge.challengeKey, {
          snippet: codeChallenge.snippet,
          vulnLines: codeChallenge.vulnLines,
          neutralLines: codeChallenge.neutralLines
        })
      }
    }
  }
  return _internalCodeChallenges
}
