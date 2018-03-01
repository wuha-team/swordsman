/* tslint:disable: no-unused-expression no-invalid-this */
import { expect } from 'chai'
import * as fs from 'fs'
import { createSandbox } from 'sinon'
import * as tmp from 'tmp'

import * as client from '../src/client'
import * as watcher from '../src/watcher'

tmp.setGracefulCleanup()

describe('watcher', () => {

  describe('Watcher class', () => {

    before('create sandbox, create a temporary directory and instantiate a Watcher', async () => {
      this.sandbox = createSandbox()

      const dir = tmp.dirSync({ dir: __dirname, prefix: 'swordsman-test', unsafeCleanup: true })
      this.dirPath = fs.realpathSync(dir.name)

      this.watcher = new watcher.Watcher(this.dirPath)

      // Wait for the watcher to be ready
      await new Promise((resolve) => {
        this.watcher.on(watcher.WatcherEvent.READY, resolve)
        this.watcher.on(watcher.WatcherEvent.ERROR, (error) => {
          console.error(error)
        })
      })
    })

    after('close watcher', async () => {
      await this.watcher.close()
    })

    afterEach('restore sandbox', () => {
      this.sandbox.restore()
    })

    it('should emit ADD event when file added', (done) => {
      this.watcher.once(watcher.WatcherEvent.ADD, (path: string, stats: fs.Stats) => {
        expect(path).to.equal(tmpFile.name)
        expect(stats).to.be.instanceof(fs.Stats)
        done()
      })

      const tmpFile = tmp.fileSync({ dir: this.dirPath })
    })

    it('should emit CHANGE event when file changed', (done) => {
      this.watcher.once(watcher.WatcherEvent.CHANGE, (path: string, stats: fs.Stats) => {
        expect(path).to.equal(tmpFile.name)
        expect(stats).to.be.instanceof(fs.Stats)
        done()
      })

      const tmpFile = tmp.fileSync({ dir: this.dirPath })

      // "Touch" the file to trigger a change
      // Wait a bit to avoid ADD/CHANGE events to be merged by watchman
      setTimeout(
        () => {
         fs.closeSync(fs.openSync(tmpFile.name, 'w'))
        },
        50,
      )
    })

    it('should emit DELETE event when file deleted', (done) => {
      this.watcher.once(watcher.WatcherEvent.DELETE, (path: string) => {
        expect(path).to.equal(tmpFile.name)
        done()
      })

      const tmpFile = tmp.fileSync({ dir: this.dirPath })

      // Remove the file
      // Wait a bit to avoid ADD/DELETE events to be merged by watchman
      setTimeout(
        () => {
         fs.unlinkSync(tmpFile.name)
        },
        50,
      )
    })

    it('should emit ALL event on any file event', (done) => {
      this.watcher.once(watcher.WatcherEvent.ALL, (path: string) => {
        expect(path).to.equal(tmpFile.name)
        done()
      })

      const tmpFile = tmp.fileSync({ dir: this.dirPath })
    })

    it('should call subscribe with custom query if provided', async () => {
      this.sandbox.spy(client.Subscription.prototype, 'subscribe')

      const customQuery: watchman.Query = { expression: ['type', 'f'] }
      const watcherCustomQuery = new watcher.Watcher(this.dirPath, { expression: ['type', 'f'] })

      await new Promise((resolve) => {
        watcherCustomQuery.on(watcher.WatcherEvent.READY, resolve)
      })

      expect(watcherCustomQuery.subscription.subscribe.args[0][0]).to.deep.equal(customQuery)

      await watcherCustomQuery.close()
    })

    describe('close', () => {

      it('should call unsubscribe on subscription', async () => {
        this.sandbox.spy(this.watcher.subscription, 'unsubscribe')

        await this.watcher.close()

        expect(this.watcher.subscription.unsubscribe.called).to.be.true
      })

    })

  })

})
