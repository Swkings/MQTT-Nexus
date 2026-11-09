import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const builderConfig = JSON.parse(readFileSync(path.join(projectRoot, 'electron-builder.json'), 'utf8'));
const argumentsList = process.argv.slice(2);
const releaseDirectory = path.join(projectRoot, 'release');
const repository = `${builderConfig.publish.owner}/${builderConfig.publish.repo}`;
const isDryRun = argumentsList.includes('--dry-run');

function printHelp() {
  console.log('Usage: npm run release:upload -- [options]');
  console.log('  --version <version>  Select package version (default: package.json version)');
  console.log('  --tag <tag>          Select release tag (default: v<version>)');
  console.log('  --files <paths...>   Upload only the specified files');
  console.log('  --dry-run            Preview files without contacting GitHub');
  console.log('  --help               Show this help');
}

if (argumentsList.includes('--help') || argumentsList.includes('-h')) {
  printHelp();
  process.exit(0);
}

let selectedVersion = packageJson.version;
let releaseTag;
let explicitFiles = null;
let positionalTag;
let versionWasSpecified = false;

for (let index = 0; index < argumentsList.length; index += 1) {
  const argument = argumentsList[index];

  if (argument === '--dry-run') continue;
  if (argument === '--version' || argument === '-v') {
    selectedVersion = argumentsList[++index] ?? '';
    versionWasSpecified = true;
    continue;
  }
  if (argument === '--tag' || argument === '-t') {
    releaseTag = argumentsList[++index] ?? '';
    continue;
  }
  if (argument === '--files' || argument === '--file' || argument === '-f') {
    explicitFiles ??= [];
    while (argumentsList[index + 1] && !argumentsList[index + 1].startsWith('--')) {
      explicitFiles.push(argumentsList[++index]);
    }
    continue;
  }
  if (argument.startsWith('-')) {
    console.error(`Unknown option: ${argument}`);
    printHelp();
    process.exit(2);
  }
  if (positionalTag) {
    console.error(`Unexpected argument: ${argument}`);
    printHelp();
    process.exit(2);
  }
  positionalTag = argument;
}

if (positionalTag && !versionWasSpecified) {
  selectedVersion = positionalTag.replace(/^v/i, '');
}

if (!selectedVersion) {
  console.error('Version cannot be empty.');
  process.exit(2);
}

selectedVersion = selectedVersion.replace(/^v/i, '');
releaseTag ||= positionalTag || `v${selectedVersion}`;
const installerPattern = /\.(appimage|deb|dmg|exe|pkg|rpm|zip)$/i;
let releaseFiles;

try {
  if (explicitFiles) {
    if (explicitFiles.length === 0) {
      throw new Error('--files requires at least one path.');
    }

    releaseFiles = explicitFiles.map((file) => {
      const resolvedPath = path.resolve(projectRoot, file);
      if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
        throw new Error(`File does not exist: ${file}`);
      }
      if (!installerPattern.test(resolvedPath) && !/\.blockmap$/i.test(resolvedPath) && !/^latest(?:-[\w-]+)?\.ya?ml$/i.test(path.basename(resolvedPath))) {
        throw new Error(`Unsupported release asset type: ${file}`);
      }
      return resolvedPath;
    });
  } else {
    releaseFiles = readdirSync(releaseDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => {
        const lowerName = name.toLowerCase();
        const isSelectedVersion = lowerName.includes(selectedVersion.toLowerCase());
        const isUpdaterMetadata = /^latest(?:-[\w-]+)?\.ya?ml$/i.test(name) &&
          readFileSync(path.join(releaseDirectory, name), 'utf8').includes(`version: ${selectedVersion}`);
        return (installerPattern.test(name) || lowerName.endsWith('.blockmap')) && isSelectedVersion || isUpdaterMetadata;
      })
      .sort()
      .map((name) => path.join(releaseDirectory, name));
  }
} catch (error) {
  console.error(`Could not select release assets: ${error.message}`);
  process.exit(1);
}

releaseFiles = [...new Set(releaseFiles)];
if (releaseFiles.length === 0) {
  console.error(`No release assets found for version ${selectedVersion}.`);
  process.exit(1);
}

console.log(`Selected ${releaseFiles.length} file(s) for ${repository} release ${releaseTag}:`);
for (const file of releaseFiles) {
  console.log(`  ${path.basename(file)}`);
}

if (isDryRun) {
  console.log(`Dry run only. If ${releaseTag} does not exist, it will be created before upload.`);
  process.exit(0);
}

const releaseCheck = spawnSync('gh', ['release', 'view', releaseTag, '--repo', repository], {
  cwd: projectRoot,
  encoding: 'utf8',
});

if (releaseCheck.error) {
  console.error(`Could not run GitHub CLI: ${releaseCheck.error.message}`);
  console.error('Install gh and authenticate with: gh auth login');
  process.exit(1);
}

if (releaseCheck.status !== 0) {
  const releaseCheckOutput = `${releaseCheck.stdout ?? ''}\n${releaseCheck.stderr ?? ''}`;
  if (!/release not found|not found.*404|http 404|404 not found/i.test(releaseCheckOutput)) {
    console.error(releaseCheckOutput.trim() || `Could not check release ${releaseTag}.`);
    process.exit(releaseCheck.status ?? 1);
  }

  console.log(`Release ${releaseTag} was not found. Creating it in ${repository}...`);
  const createRelease = spawnSync('gh', [
    'release', 'create', releaseTag,
    '--title', releaseTag,
    '--generate-notes',
    '--repo', repository,
  ], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (createRelease.error) {
    console.error(`Could not create GitHub Release: ${createRelease.error.message}`);
    process.exit(1);
  }
  if (createRelease.status !== 0) {
    process.exit(createRelease.status ?? 1);
  }
}

const upload = spawnSync('gh', [
  'release', 'upload', releaseTag, ...releaseFiles, '--repo', repository, '--clobber',
], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (upload.error) {
  console.error(`Could not upload release assets: ${upload.error.message}`);
  process.exit(1);
}

process.exit(upload.status ?? 1);