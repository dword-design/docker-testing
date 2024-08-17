import { endent } from '@dword-design/functions';
import tester from '@dword-design/tester';
import testerPluginDocker from '@dword-design/tester-plugin-docker';
import { execa, execaCommand } from 'execa';
import fs from 'fs-extra';
import os from 'os';
import outputFiles from 'output-files';
import { v4 as uuid } from 'uuid';
import withLocalTmpDir from 'with-local-tmp-dir';

const userInfo = os.userInfo();

export default tester(
  {
    dot: () => execaCommand('docker run --rm self dot -V'),
    emoji() {
      return withLocalTmpDir(async () => {
        await outputFiles({
          '.yarnrc.yml': 'nodeLinker: node-modules\n',
          'index.js': endent`
            import express from 'express'
            import { chromium } from 'playwright'

            const server = express()
              .get('/', (req, res) => res.send('<span class="emoji">🙌</span>'))
              .listen(3000)
            const browser = await chromium.launch()
            const page = await browser.newPage()
            await page.goto('http://localhost:3000')
            const emoji = await page.waitForSelector('.emoji')
            await emoji.screenshot({ path: 'screenshot.png' })
            await browser.close()
            await server.close()
          `,
          'package.json': JSON.stringify({ name: 'foo', type: 'module' }),
          'yarn.lock': '',
        });

        await execaCommand('yarn set version stable');
        await execaCommand('yarn add playwright playwright-chromium express');

        try {
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            '/app/node_modules',
            'self',
            'bash',
            '-c',
            'yarn --immutable && node index.js',
          ]);
        } finally {
          // fix permissions
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            '/app/node_modules',
            'self',
            'bash',
            '-c',
            `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
          ]);
        }

        expect(await fs.readFile('screenshot.png')).toMatchImageSnapshot(this);
      });
    },
    files: () =>
      withLocalTmpDir(async () => {
        await fs.outputFile(
          'package.json',
          JSON.stringify({ name: 'foo', type: 'module' }),
        );

        const output = await execa('docker', [
          'run',
          '--rm',
          '-v',
          `${process.cwd()}:/app`,
          'self',
          'bash',
          '-c',
          'cat package.json',
        ]);

        expect(output.stdout).toEqual(
          JSON.stringify({ name: 'foo', type: 'module' }),
        );
      }),
    git: () =>
      withLocalTmpDir(async () => {
        await fs.outputFile('foo.txt', '');

        try {
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app:delegated`,
            'self',
            'bash',
            '-c',
            [
              'git init',
              'git add .',
              'git config user.email foo@bar.de',
              'git config user.name foo',
              'git commit -m foo',
            ].join(' && '),
          ]);
        } finally {
          // fix permissions
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            'self',
            'bash',
            '-c',
            `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
          ]);
        }
      }),
    playwright: () =>
      withLocalTmpDir(async () => {
        await outputFiles({
          '.yarnrc.yml': 'nodeLinker: node-modules\n',
          'index.js': endent`
            import { chromium } from 'playwright'

            const browser = await chromium.launch()
            await browser.close()
          `,
          'package.json': JSON.stringify({ name: 'foo', type: 'module' }),
          'yarn.lock': '',
        });

        await execaCommand('yarn set version stable');
        await execaCommand('yarn add playwright playwright-chromium');

        try {
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            '/app/node_modules',
            'self',
            'bash',
            '-c',
            'yarn --immutable && node index.js',
          ]);
        } finally {
          // fix permissions
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            '/app/node_modules',
            'self',
            'bash',
            '-c',
            `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
          ]);
        }
      }),
    'playwright multiple runs': () =>
      withLocalTmpDir(async () => {
        await outputFiles({
          '.yarnrc.yml': 'nodeLinker: node-modules\n',
          'index.js': endent`
            import { chromium } from 'playwright'

            const browser = await chromium.launch()
            await browser.close()
          `,
          'package.json': JSON.stringify({ name: 'foo', type: 'module' }),
          'yarn.lock': '',
        });

        await execaCommand('yarn set version stable');
        await execaCommand('yarn add playwright playwright-chromium');
        const volumeName = uuid();

        await execa('docker', [
          'run',
          '--rm',
          '-v',
          `${process.cwd()}:/app`,
          '-v',
          `${volumeName}:/app/node_modules`,
          'self',
          'bash',
          '-c',
          'yarn --immutable && node index.js',
        ]);

        try {
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            `${volumeName}:/app/node_modules`,
            'self',
            'bash',
            '-c',
            'yarn --immutable && node index.js',
          ]);
        } finally {
          // fix permissions
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            `${volumeName}:/app/node_modules`,
            'self',
            'bash',
            '-c',
            `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
          ]);

          await execaCommand(`docker volume rm ${volumeName}`);
        }
      }),
    ps: () => execaCommand('docker run --rm self ps'),
    puppeteer: () =>
      withLocalTmpDir(async () => {
        await outputFiles({
          '.yarnrc.yml': 'nodeLinker: node-modules\n',
          'index.js': endent`
            import puppeteer from '@dword-design/puppeteer'

            const browser = await puppeteer.launch()
            await browser.close()
          `,
          'package.json': JSON.stringify({ name: 'foo', type: 'module' }),
          'yarn.lock': '',
        });

        await execaCommand('yarn set version stable');
        await execaCommand('yarn add @dword-design/puppeteer');

        try {
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            '/app/node_modules',
            'self',
            'bash',
            '-c',
            'yarn --immutable && node index.js',
          ]);
        } finally {
          // fix permissions
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            '/app/node_modules',
            'self',
            'bash',
            '-c',
            `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
          ]);
        }
      }),
    'puppeteer multiple runs': () =>
      withLocalTmpDir(async () => {
        await outputFiles({
          '.yarnrc.yml': 'nodeLinker: node-modules\n',
          'index.js': endent`
            import puppeteer from '@dword-design/puppeteer'

            const browser = await puppeteer.launch()
            await browser.close()
          `,
          'package.json': JSON.stringify({ name: 'foo', type: 'module' }),
          'yarn.lock': '',
        });

        await execaCommand('yarn set version stable');
        await execaCommand('yarn add @dword-design/puppeteer');
        const volumeName = uuid();

        await execa('docker', [
          'run',
          '--rm',
          '-v',
          `${process.cwd()}:/app`,
          '-v',
          `${volumeName}:/app/node_modules`,
          'self',
          'bash',
          '-c',
          'yarn --immutable && node index.js',
        ]);

        try {
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            `${volumeName}:/app/node_modules`,
            'self',
            'bash',
            '-c',
            'yarn --immutable && node index.js',
          ]);
        } finally {
          // fix permissions
          await execa('docker', [
            'run',
            '--rm',
            '-v',
            `${process.cwd()}:/app`,
            '-v',
            `${volumeName}:/app/node_modules`,
            'self',
            'bash',
            '-c',
            `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
          ]);

          await execaCommand(`docker volume rm ${volumeName}`);
        }
      }),
  },
  [testerPluginDocker()],
);
