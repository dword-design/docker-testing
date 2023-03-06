import { endent } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginDocker from '@dword-design/tester-plugin-docker'
import { execa, execaCommand } from 'execa'
import fs from 'fs-extra'
import os from 'os'
import outputFiles from 'output-files'
import withLocalTmpDir from 'with-local-tmp-dir'

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
    git: () => execaCommand('docker run --rm self git --version'),
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

        const userInfo = os.userInfo()
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
