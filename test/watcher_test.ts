/* tslint:disable: no-unused-expression no-invalid-this variable-name */
import { expect } from 'chai'
import * as watchman from 'fb-watchman'
import * as fs from 'fs'
import { createSandbox, SinonSpy, SinonStub } from 'sinon'
import * as tmp from 'tmp'

import { createWatcher } from './_factories/_watcher'

import * as client from '../src/client'
import * as watcher from '../src/watcher'

tmp.setGracefulCleanup()

describe('watcher', () => {

  describe('Watcher class', () => {

    before('create sandbox, create a temporary directory and instantiate a Watcher', async () => {
      this.sandbox = createSandbox()

      const dir = tmp.dirSync({ dir: __dirname, prefix: 'swordsman-test', unsafeCleanup: true })
      this.dirPath = fs.realpathSync(dir.name)

      this.existingFile = tmp.fileSync({ dir: this.dirPath })

      this.watcher = await createWatcher(this.dirPath)
    })

    after('close watcher', async () => {
      await this.watcher.close()
    })

    afterEach('restore sandbox', () => {
      this.sandbox.restore()
    })

    it('should emit ADD event on existing files if option enabled', async () => {
      const watcherExistingEnabled = await createWatcher(this.dirPath, null, { reportExistingFiles: true })

      await new Promise((resolve) => {
        watcherExistingEnabled.once(watcher.WatcherEvent.ADD, (path: string, stats: fs.Stats) => {
          expect(path).to.equal(this.existingFile.name)
          expect(stats).to.be.instanceof(fs.Stats)

          resolve()
        })
      })

      await watcherExistingEnabled.close()
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

    it('should emit ERROR at initialiation if capabilityCheck returns an error', () => {
      this.sandbox.stub(client, 'getClientInstance').returns({
        capabilityCheck: this.sandbox.stub().callsFake((_options, callback) => callback('error')),
        on: this.sandbox.stub(),
        close: this.sandbox.stub(),
      })

      // Our test watcher factory abstracts the initialization with a promise
      // So check for the promise rejection is equivalent to have an error event emitted
      expect(createWatcher(this.dirPath)).to.eventually.be.rejected
    })

    it('should emit ERROR at initialiation if capabilityCheck rejects', () => {
      this.sandbox.stub(client, 'getClientInstance').returns({
        capabilityCheck: this.sandbox.stub().throws(),
        on: this.sandbox.stub(),
        close: this.sandbox.stub(),
      })

      // Our test watcher factory abstracts the initialization with a promise
      // So check for the promise rejection is equivalent to have an error event emitted
      expect(createWatcher(this.dirPath)).to.eventually.be.rejected
    })

    it('should creation subscription with custom query if provided', async () => {
      const customQuery: watchman.Query = { expression: ['type', 'f'] }
      const watcherCustomQuery = await createWatcher(this.dirPath, customQuery)

      expect(watcherCustomQuery.subscription.query).to.deep.equal(customQuery)

      await watcherCustomQuery.close()
    })

    describe('close', () => {

      it('should call unsubscribe on subscription', async () => {
        const watcherInstance = await createWatcher(this.dirPath)

        this.sandbox.spy(watcherInstance.subscription, 'unsubscribe')

        await watcherInstance.close()

        expect((<SinonSpy> watcherInstance.subscription.unsubscribe).called).to.be.true
      })

      it('should rejects if something goes wrong when unsubscribing', async () => {
        const watcherInstance = await createWatcher(this.dirPath)

        const unsubscribeStub: SinonStub = this.sandbox.stub(watcherInstance.subscription, 'unsubscribe').rejects()

        expect(watcherInstance.close()).to.eventually.be.rejected

        // Restore and close to allow a graceful exit
        unsubscribeStub.restore()
        await watcherInstance.close()
      })

    })

  })

})
