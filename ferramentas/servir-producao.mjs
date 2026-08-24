/**
 * Sobe o servidor de produção do mesmo jeito que o contêiner sobe.
 *
 * Com `output: 'standalone'`, o `next start` avisa que não é para usar: quem
 * roda é o `.next/standalone/server.js`. Só que o Next deixa os arquivos
 * estáticos fora dessa pasta de propósito — o Dockerfile copia à mão, e aqui
 * também. Sem a cópia, o painel abre sem estilo nenhum e parece quebrado.
 */
import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const PACOTE = '.next/standalone';

if (!existsSync(`${PACOTE}/server.js`)) {
  console.error('Falta o build. Rode `npm run build` antes.');
  process.exit(1);
}

cpSync('.next/static', `${PACOTE}/.next/static`, { recursive: true });

const servidor = spawn(process.execPath, ['server.js'], {
  cwd: PACOTE,
  stdio: 'inherit',
  env: { HOSTNAME: '0.0.0.0', PORT: '3000', ...process.env },
});

servidor.on('exit', (codigo) => process.exit(codigo ?? 0));
