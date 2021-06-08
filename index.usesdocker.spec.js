import { endent } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginDocker from '@dword-design/tester-plugin-docker'
import packageName from 'depcheck-package-name'
import execa from 'execa'
import { outputFile } from 'fs-extra'
import nodeVersionAlias from 'node-version-alias'
import outputFiles from 'output-files'
import semverMajor from 'semver/functions/major'
import withLocalTmpDir from 'with-local-tmp-dir'

export default tester(
  {
    dot: () => execa.command('docker run --rm self dot -V'),
    files: () =>
      withLocalTmpDir(async () => {
        await outputFile('package.json', JSON.stringify({ name: 'foo' }))

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
    git: () => execa.command('docker run --rm self git --version'),
    'nodejs version': async () => {
      const output = await execa.command('docker run --rm self node -v')
      expect(output.stdout |> semverMajor).toEqual(
        nodeVersionAlias('lts') |> await |> semverMajor
      )
    },
    ps: () => execa.command('docker run --rm self ps'),
    puppeteer: () =>
      withLocalTmpDir(async () => {
        await outputFiles({
          'index.js': endent`
          const puppeteer = require('${packageName`@dword-design/puppeteer`}')

          const run = async () => {
            const browser = await puppeteer.launch()
            await browser.close()
          }

          run()

        `,
          'package.json': JSON.stringify({ name: 'foo' }),
        })
        await execa.command('yarn add @dword-design/puppeteer')
        await execa('docker', [
          'run',
          '--rm',
          '-v',
          `${process.cwd()}:/app`,
          'self',
          'node',
          '/app/index.js',
        ])
      }),
  },
  [testerPluginDocker()]
)
