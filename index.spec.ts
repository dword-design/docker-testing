import os from 'node:os';
import pathLib from 'node:path';

import { expect, test } from '@playwright/test';
import endent from 'endent';
import { execa, execaCommand } from 'execa';
import fs from 'fs-extra';
import { globby } from 'globby';
import outputFiles from 'output-files';
import { v4 as uuid } from 'uuid';
import yaml from 'yaml';

import containerName from './fixtures/container-name';

const userInfo = os.userInfo();

test('dot', async () => {
  await execaCommand(`docker run --rm ${containerName} dot -V`);
});

test('emoji', async ({}, testInfo) => {
  const cwd = testInfo.outputPath();

  await outputFiles(cwd, {
    'index.js': endent`
      import express from 'express';
      import { chromium } from 'playwright';

      const server = express()
        .get('/', (req, res) => res.send('<span class="emoji">🙌</span>'))
        .listen(3000);
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto('http://localhost:3000');
      const emoji = page.waitForSelector('.emoji');
      await emoji.screenshot({ path: 'screenshot.png' });
      await browser.close();
      await server.close();
    `,
    'package.json': JSON.stringify({
      dependencies: {
        '@playwright/browser-chromium': '*',
        express: '*',
        playwright: '*',
      },
      name: 'foo',
      type: 'module',
    }),
    'pnpm-workspace.yaml': yaml.stringify({
      onlyBuiltDependencies: ['@playwright/browser-chromium'],
    }),
  });

  await execaCommand('pnpm install', { cwd });

  try {
    await execa(
      'docker',
      [
        'run',
        '--rm',
        '-v',
        `${cwd}:/app`,
        '-v',
        '/app/node_modules',
        containerName,
        'bash',
        '-c',
        'pnpm install --frozen-lockfile && node index.js',
      ],
      { all: true },
    );
  } finally {
    if (process.platform === 'linux') {
      await execa('docker', [
        'run',
        '--rm',
        '-v',
        `${cwd}:/app`,
        '-v',
        '/app/node_modules',
        containerName,
        'bash',
        '-c',
        `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
      ]);
    }
  }

  expect(
    await fs.readFile(pathLib.join(cwd, 'screenshot.png')),
  ).toMatchSnapshot();
});

test('files', async ({}, testInfo) => {
  const cwd = testInfo.outputPath();

  await fs.outputFile(
    pathLib.join(cwd, 'package.json'),
    JSON.stringify({ name: 'foo', type: 'module' }),
  );

  const output = await execa(
    'docker',
    [
      'run',
      '--rm',
      '-v',
      `${cwd}:/app`,
      containerName,
      'bash',
      '-c',
      'cat package.json',
    ],
    { cwd },
  );

  expect(output.stdout).toEqual(
    JSON.stringify({ name: 'foo', type: 'module' }),
  );
});

test('git', async ({}, testInfo) => {
  const cwd = testInfo.outputPath();
  await fs.outputFile(pathLib.join(cwd, 'foo.txt'), '');

  try {
    await execa('docker', [
      'run',
      '--rm',
      '-v',
      `${cwd}:/app:delegated`,
      containerName,
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
    if (process.platform === 'linux') {
      await execa('docker', [
        'run',
        '--rm',
        '-v',
        `${cwd}:/app`,
        containerName,
        'bash',
        '-c',
        `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
      ]);
    }
  }
});

test('java for Firebase Extensions Emulator', async () => {
  await execaCommand(`docker run --rm ${containerName} java -version`);
});

test('playwright', async ({}, testInfo) => {
  const cwd = testInfo.outputPath();

  await outputFiles(cwd, {
    'index.js': endent`
      import { chromium } from 'playwright'

      const browser = await chromium.launch()
      await browser.close()
    `,
    'package.json': JSON.stringify({
      dependencies: { '@playwright/browser-chromium': '*', playwright: '*' },
      name: 'foo',
      type: 'module',
    }),
    'pnpm-workspace.yaml': yaml.stringify({
      onlyBuiltDependencies: ['@playwright/browser-chromium'],
    }),
  });

  await execaCommand('pnpm install', { cwd });

  try {
    await execa('docker', [
      'run',
      '--rm',
      '-v',
      `${cwd}:/app`,
      '-v',
      '/app/node_modules',
      containerName,
      'bash',
      '-c',
      'pnpm install --frozen-lockfile && node index.js',
    ]);
  } finally {
    if (process.platform === 'linux') {
      await execa('docker', [
        'run',
        '--rm',
        '-v',
        `${cwd}:/app`,
        '-v',
        '/app/node_modules',
        containerName,
        'bash',
        '-c',
        `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
      ]);
    }
  }
});

test('playwright multiple runs', async ({}, testInfo) => {
  const cwd = testInfo.outputPath();

  await outputFiles(cwd, {
    'index.js': endent`
      import { chromium } from 'playwright';

      const browser = await chromium.launch();
      await browser.close();
    `,
    'package.json': JSON.stringify({
      dependencies: { '@playwright/browser-chromium': '*', playwright: '*' },
      name: 'foo',
      type: 'module',
    }),
    'pnpm-workspace.yaml': yaml.stringify({
      onlyBuiltDependencies: ['@playwright/browser-chromium'],
    }),
  });

  await execaCommand('pnpm install', { cwd });
  const volumeName = uuid();

  await execa('docker', [
    'run',
    '--rm',
    '-v',
    `${cwd}:/app`,
    '-v',
    `${volumeName}:/app/node_modules`,
    containerName,
    'bash',
    '-c',
    'pnpm install --frozen-lockfile && node index.js',
  ]);

  try {
    await execa('docker', [
      'run',
      '--rm',
      '-v',
      `${cwd}:/app`,
      '-v',
      `${volumeName}:/app/node_modules`,
      containerName,
      'bash',
      '-c',
      'pnpm install --frozen-lockfile && node index.js',
    ]);
  } finally {
    if (process.platform === 'linux') {
      await execa('docker', [
        'run',
        '--rm',
        '-v',
        `${cwd}:/app`,
        '-v',
        `${volumeName}:/app/node_modules`,
        containerName,
        'bash',
        '-c',
        `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
      ]);
    }

    await execaCommand(`docker volume rm ${volumeName}`);
  }
});

test('pnpm store outside app path on host', async ({}, testInfo) => {
  const cwd = testInfo.outputPath();

  await fs.outputFile(
    pathLib.join(cwd, 'package.json'),
    JSON.stringify({
      dependencies: { globby: '*' },
      name: 'foo',
      type: 'module',
    }),
  );

  await execaCommand('pnpm install', { cwd });

  try {
    await execa('docker', [
      'run',
      '--rm',
      '-v',
      `${cwd}:/app`,
      '-v',
      '/app/node_modules',
      containerName,
      'bash',
      '-c',
      'pnpm install --frozen-lockfile',
    ]);

    expect(await globby('*', { cwd, onlyFiles: false })).toEqual([
      'node_modules',
      'package.json',
      'pnpm-lock.yaml',
    ]);
  } finally {
    if (process.platform === 'linux') {
      await execa('docker', [
        'run',
        '--rm',
        '-v',
        `${cwd}:/app`,
        '-v',
        '/app/node_modules',
        containerName,
        'bash',
        '-c',
        `chown -R ${userInfo.uid}:${userInfo.gid} /app`,
      ]);
    }
  }
});

test('ps', async () => {
  await execaCommand(`docker run --rm ${containerName} ps`);
});
