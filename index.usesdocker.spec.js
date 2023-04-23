import { endent } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginDocker from '@dword-design/tester-plugin-docker'
import { execa, execaCommand } from 'execa'
import fs from 'fs-extra'
import os from 'os'
import outputFiles from 'output-files'
import { v4 as uuid } from 'uuid'
import withLocalTmpDir from 'with-local-tmp-dir'

const userInfo = os.userInfo()

export default tester(
  {
    dot: () => execaCommand('docker run --rm self dot -V'),
    emoji() {
      return withLocalTmpDir(async () => {
        await outputFiles({
          'index.js': endent`
            import express from 'express'
            import puppeteer from '@dword-design/puppeteer'

            const run = async () => {
              const server = express()
                .get('/', (req, res) => res.send('<span class="emoji">🙌</span>'))
                .listen(3000)
              const browser = await puppeteer.launch()
              const page = await browser.newPage()
              await page.goto('http://localhost:3000')
              const emoji = await page.waitForSelector('.emoji')
              await emoji.screenshot({ path: 'screenshot.png' })
              await browser.close()
              await server.close()
            }

            run()

          `,
          'package.json': JSON.stringify({ name: 'foo', type: 'module' }),
        })
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
          'yarn add @dword-design/puppeteer express && node index.js',
        ])
        expect(await fs.readFile('screenshot.png')).toMatchImageSnapshot(this)
      })
    },
    files: () =>
      withLocalTmpDir(async () => {
        await fs.outputFile(
          'package.json',
          JSON.stringify({ name: 'foo', type: 'module' }),
        )

        const output = await execa('docker', [
          'run',
          '--rm',
          '-v',
          `${process.cwd()}:/app`,
          'self',
          'bash',
          '-c',
          'cat package.json',
        ])
        expect(output.stdout).toEqual(
          JSON.stringify({ name: 'foo', type: 'module' }),
        )
      }),
    git: () =>
      withLocalTmpDir(async () => {
        await fs.outputFile('foo.txt', '')
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
          ])
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
          ])
        }
      }),
    ps: () => execaCommand('docker run --rm self ps'),
    puppeteer: () =>
      withLocalTmpDir(async () => {
        await outputFiles({
          'index.js': endent`
            import puppeteer from '@dword-design/puppeteer'
            import Xvfb from 'xvfb'

            const xvfb = new Xvfb()

            const run = async () => {
              try {
                xvfb.startSync()
                const browser = await puppeteer.launch({ headless: false })
                await browser.close()
                xvfb.stopSync()
              } catch (error) {
                console.error(error)
                process.exit(1)
              }
            }

            run()

          `,
          'package.json': JSON.stringify({ name: 'foo', type: 'module' }),
        })
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
          'yarn add @dword-design/puppeteer xvfb && node /app/index.js',
        ])
      }),
    'puppeteer multiple runs': () =>
      withLocalTmpDir(async () => {
        await outputFiles({
          'index.js': endent`
            import puppeteer from '@dword-design/puppeteer'

            const run = async () => {
              const browser = await puppeteer.launch()
              await browser.close()
            }

            run()
          `,
          'package.json': JSON.stringify({ name: 'foo', type: 'module' }),
        })

        const volumeName = uuid()
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
          'yarn add @dword-design/puppeteer && node /app/index.js',
        ])
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
            'yarn --frozen-lockfile && node /app/index.js',
          ])
        } finally {
          await execaCommand(`docker volume rm ${volumeName}`)
        }
      }),
    'webpack 4': () =>
      withLocalTmpDir(async () => {
        await outputFiles({
          'index.js': endent`
            import { Builder, Nuxt } from 'nuxt'

            const nuxt = new Nuxt({ dev: false })
            await new Builder(nuxt).build()
          `,
          'package.json': JSON.stringify({ name: 'foo', type: 'module' }),
        })
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
          `yarn add nuxt@^2 && node /app/index.js && chown -R ${userInfo.uid}:${userInfo.gid} /app`,
        ])
      }),
  },
  [testerPluginDocker()],
)
