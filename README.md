# @kdt310722/logger

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![ci][ci-src]][ci-href]
[![issues][issues-src]][issues-href]
[![license][license-src]][license-href]

A simple NodeJS logger library

## Usage

Install package:

```sh
# npm
npm install @kdt310722/logger

# yarn
yarn add @kdt310722/logger

# pnpm
pnpm install @kdt310722/logger

# bun
bun install @kdt310722/logger
```

Import:

```js
// ESM
import { createDefaultLogger } from '@kdt310722/logger'

// CommonJS
const { createDefaultLogger } = require('@kdt310722/logger')
```

Use:

```js
const logger = createDefaultLogger()

logger.trace('trace')
logger.debug('debug')
logger.info('info')
logger.warn('warn')
logger.error('error')
logger.fatal(new Error('fatal'))
```

## License

Published under [MIT License](LICENSE.md).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@kdt310722/logger?style=flat&colorA=1B3C4A&colorB=32A9C3&label=version
[npm-version-href]: https://npmjs.com/package/@kdt310722/logger
[npm-downloads-src]: https://img.shields.io/npm/dm/@kdt310722/logger?style=flat&colorA=1B3C4A&colorB=32A9C3&label=downloads
[npm-downloads-href]: https://npmjs.com/package/@kdt310722/logger
[ci-src]: https://img.shields.io/github/actions/workflow/status/kdt310722/logger/ci.yml?style=flat&colorA=1B3C4A&colorB=32A9C3&label=ci
[ci-href]: https://github.com/kdt310722/logger/actions/workflows/ci.yml
[issues-src]: https://img.shields.io/github/issues/kdt310722/logger?style=flat&colorA=1B3C4A&colorB=32A9C3&label=issues
[issues-href]: https://github.com/kdt310722/logger/issues
[license-src]: https://img.shields.io/npm/l/@kdt310722/logger?style=flat&colorA=1B3C4A&colorB=32A9C3&label=license
[license-href]: https://github.com/@kdt310722/logger/blob/main/LICENSE.md
