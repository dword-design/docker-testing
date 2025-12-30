import { execaCommand } from 'execa';

import containerName from './fixtures/container-name';

export default () =>
  execaCommand(
    `docker build --file index.dockerfile --tag ${containerName} .`,
    { stdio: 'inherit' },
  );
