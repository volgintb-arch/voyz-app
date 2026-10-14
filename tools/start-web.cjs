// Запуск веб-версии Expo из корня проекта, откуда бы ни вызвали скрипт
// (встроенный браузер Claude стартует серверы из своей рабочей папки).
const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'node_modules', 'expo', 'bin', 'cli');
const args = ['start', '--web', '--port', process.env.PORT || '8081', ...process.argv.slice(2)];

spawn(process.execPath, [cli, ...args], { cwd: root, stdio: 'inherit' }).on('exit', (code) =>
  process.exit(code ?? 0),
);
