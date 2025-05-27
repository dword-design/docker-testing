import { execaCommand } from 'execa';

export default () =>
  execaCommand('docker build --file index.dockerfile --tag self .', {
    stdio: 'inherit',
  });
