import os from 'node:os';

import { endent } from '@dword-design/functions';
import { expect, test } from '@playwright/test';
import { execa, execaCommand } from 'execa';
import fs from 'fs-extra';
import { globby } from 'globby';
import outputFiles from 'output-files';
import { v4 as uuid } from 'uuid';
import withLocalTmpDir from 'with-local-tmp-dir';
import yaml from 'yaml';

const userInfo = os.userInfo();
test('dot', () => execaCommand('docker run --rm self dot -V'));

test('emoji', () =>
  withLocalTmpDir(async () => {
    await outputFiles({
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
      'package.json': JSON.stringify({
        dependencies: {
          express: '*',
          playwright: '*',
          'playwright-chromium': '*',
        },
        name: 'foo',
        type: 'module',
      }),
      'pnpm-workspace.yaml': yaml.stringify({
        onlyBuiltDependencies: ['playwright-chromium'],
      }),
    });

    await execaCommand('pnpm install');

    try {
      await execa(
        'docker',
        [
          'run',
          '--rm',
          '-v',
          `${process.cwd()}:/app`,
          '-v',
          '/app/node_modules',
          'self',
          'bash',
          '-c',
          'pnpm install --frozen-lockfile && node index.js',
        ],
        { all: true },
      );
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

    expect(await fs.readFile('screenshot.png')).toMatchSnapshot();
  }));

test('files', () =>
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
  }));

test('git', () =>
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
  }));

test('java for Firebase Extensions Emulator', () =>
  execaCommand('docker run --rm self java -version'));

test('playwright', () =>
  withLocalTmpDir(async () => {
    await outputFiles({
      'index.js': endent`
        import { chromium } from 'playwright'

        const browser = await chromium.launch()
        await browser.close()
      `,
      'package.json': JSON.stringify({
        dependencies: { playwright: '*', 'playwright-chromium': '*' },
        name: 'foo',
        type: 'module',
      }),
      'pnpm-workspace.yaml': yaml.stringify({
        onlyBuiltDependencies: ['playwright-chromium'],
      }),
    });

    await execaCommand('pnpm install');

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
        'pnpm install --frozen-lockfile && node index.js',
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
  }));

test('playwright multiple runs', () =>
  withLocalTmpDir(async () => {
    await outputFiles({
      'index.js': endent`
        import { chromium } from 'playwright';

        const browser = await chromium.launch();
        await browser.close();
      `,
      'package.json': JSON.stringify({
        dependencies: { playwright: '*', 'playwright-chromium': '*' },
        name: 'foo',
        type: 'module',
      }),
      'pnpm-workspace.yaml': yaml.stringify({
        onlyBuiltDependencies: ['playwright-chromium'],
      }),
    });

    await execaCommand('pnpm install');
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
      'pnpm install --frozen-lockfile && node index.js',
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
        'pnpm install --frozen-lockfile && node index.js',
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
  }));

test('pnpm store outside app path on host', () =>
  withLocalTmpDir(async () => {
    await fs.outputFile(
      'package.json',
      JSON.stringify({
        dependencies: { globby: '*' },
        name: 'foo',
        type: 'module',
      }),
    );

    await execaCommand('pnpm install');

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
        'pnpm install --frozen-lockfile',
      ]);

      expect(await globby('*', { onlyFiles: false })).toEqual([
        'node_modules',
        'package.json',
        'pnpm-lock.yaml',
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
  }));

test('ps', () => execaCommand('docker run --rm self ps'));

test('puppeteer', () =>
  withLocalTmpDir(async () => {
    await outputFiles({
      'index.js': endent`
        import puppeteer from '@dword-design/puppeteer';

        const browser = await puppeteer.launch();
        await browser.close();
      `,
      'package.json': JSON.stringify({
        dependencies: { '@dword-design/puppeteer': '*' },
        name: 'foo',
        type: 'module',
      }),
      'pnpm-workspace.yaml': yaml.stringify({
        onlyBuiltDependencies: ['puppeteer'],
      }),
    });

    await execaCommand('pnpm install');

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
        'pnpm install --frozen-lockfile && node index.js',
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
  }));

test('puppeteer multiple runs', () =>
  withLocalTmpDir(async () => {
    await outputFiles({
      'index.js': endent`
        import puppeteer from '@dword-design/puppeteer'

        const browser = await puppeteer.launch()
        await browser.close()
      `,
      'package.json': JSON.stringify({
        dependencies: { '@dword-design/puppeteer': '*' },
        name: 'foo',
        type: 'module',
      }),
      'pnpm-workspace.yaml': yaml.stringify({
        onlyBuiltDependencies: ['puppeteer'],
      }),
    });

    await execaCommand('pnpm install');
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
      'pnpm install --frozen-lockfile && node index.js',
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
        'pnpm install --frozen-lockfile && node index.js',
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
  }));
