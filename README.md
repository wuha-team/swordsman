# Swordsman ⚔️

[![Build Status](https://travis-ci.org/frankie567/swordsman.svg?branch=master)](https://travis-ci.org/frankie567/swordsman) [![Coverage Status](https://coveralls.io/repos/github/frankie567/swordsman/badge.svg?branch=master)](https://coveralls.io/github/frankie567/swordsman?branch=master)

Swordsman is a file watch interface for [Facebook Watchman](https://github.com/facebook/watchman). The goal is to provide an easy to use API to leverage all the power of Watchman in NodeJS. It is heavily inspired by [sane](https://github.com/amasad/sane), but focused exclusively on Watchman.

## Install

```bash
npm install swordsman
```

## Usage

```ts
import { Stats } from 'fs'
import * as swordsman from 'swordsman'

const watcher = new sworsdman.Watcher('/path/to/watch')

watcher.on('ready', () => { console.log('ready') })
watcher.on('add', (path: string, stats: Stats) => { console.log('file added', path, stats) })
watcher.on('change', (path: string, stats: Stats) => { console.log('file changed', path, stats) })
watcher.on('delete', (path: string) => { console.log('file deleted', path) })

watcher.close().then(() => { console.log('watcher closed') })
```

By default, every files and directories are reported. To filter the watched files, use the [Watchman query language](https://facebook.github.io/watchman/docs/file-query.html). For example, to watch only `.js` files:

```ts
const watcher = new sworsdman.Watcher(
  '/path/to/watch',
  {
    expression: [
      'allof',
      [ 'type', 'f' ],
      [ 'suffix', 'js' ]
    ]
  }
)
```

### Options

You can provide `options` object as a third parameter to the `swordsman.Watcher` constructor.

* `watchmanBinaryPath` (`string`): Path to the Watchman binary.
* `reportExistingFiles` (`bool`, default `false`): Whether to send an ADD event for existing files on watch initialization.
