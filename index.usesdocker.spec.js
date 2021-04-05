import tester from '@dword-design/tester'
import testerPluginDocker from '@dword-design/tester-plugin-docker'
import execa from 'execa'

export default tester(
  {
    git: () => execa.command('docker run --rm self git --version'),
  },
  [testerPluginDocker()]
)
