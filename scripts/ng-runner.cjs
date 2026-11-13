const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const webRoot = path.join(repositoryRoot, 'apps', 'web');
const cli = path.join(repositoryRoot, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { cwd: webRoot, stdio: 'inherit' });
process.exit(result.status ?? 1);
