import { endent } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginDocker from '@dword-design/tester-plugin-docker'
import { execa, execaCommand } from 'execa'
import fs from 'fs-extra'
import nodeVersionAlias from 'node-version-alias'
import outputFiles from 'output-files'
import semver from 'semver'
import withLocalTmpDir from 'with-local-tmp-dir'

export default tester(
  {
    dot: () => execaCommand('docker run --rm self dot -V'),
    emoji() {
      return withLocalTmpDir(async () => {
        await outputFiles({
          'index.js': endent`
          const express = require('express')
          const puppeteer = require('@dword-design/puppeteer')

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
          'package.json': JSON.stringify({ name: 'foo' }),
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
        await fs.outputFile('package.json', JSON.stringify({ name: 'foo' }))

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
        expect(output.stdout).toEqual(JSON.stringify({ name: 'foo' }))
      }),
    git: () => execaCommand('docker run --rm self git --version'),
    'nodejs version': async () => {
      const output = await execaCommand('docker run --rm self node -v')
      expect(output.stdout |> semver.major).toEqual(
        nodeVersionAlias('lts') |> await |> semver.major
      )
    },
    ps: () => execaCommand('docker run --rm self ps'),
    puppeteer: () =>
      withLocalTmpDir(async () => {
        await outputFiles({
          'index.js': endent`
          const puppeteer = require('@dword-design/puppeteer')
          const Xvfb = require('xvfb')

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
          'package.json': JSON.stringify({ name: 'foo' }),
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
  },
  [testerPluginDocker()]
)
