import { endent } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginDocker from '@dword-design/tester-plugin-docker'
import execa from 'execa'
import { outputFile } from 'fs-extra'
import packageName from 'depcheck-package-name'

export default tester(
  {
    git: () => execa.command('docker run --rm self git --version'),
    ps: () => execa.command('docker run --rm self ps'),
    puppeteer: async () => {
      await outputFile(
        'index.js',
        endent`
        const puppeteer = require('${packageName`@dword-design/puppeteer`}')

        const run = async () => {
          const browser = await puppeteer.launch()
          await browser.close()
        }

        run()

      `
      )
      await execa('docker', [
        'run',
        '--rm',
        '-v',
        `${process.cwd()}:/app`,
        'self',
        'node',
        '/app/index.js',
      ])
    },
  },
  [testerPluginDocker()]
)
