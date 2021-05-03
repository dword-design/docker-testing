import { endent } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginDocker from '@dword-design/tester-plugin-docker'
import packageName from 'depcheck-package-name'
import execa from 'execa'
import outputFiles from 'output-files'
import withLocalTmpDir from 'with-local-tmp-dir'

export default tester(
  {
    dot: () => execa.command('docker run --rm self dot -V'),
    git: () => execa.command('docker run --rm self git --version'),
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
