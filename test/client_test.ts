/* tslint:disable: no-unused-expression no-invalid-this variable-name */
import { expect } from 'chai'
import * as watchman from 'fb-watchman'
import * as fs from 'fs'
import * as path from 'path'
import { createSandbox } from 'sinon'
import * as tmp from 'tmp'

import * as client from '../src/client'

tmp.setGracefulCleanup()

describe('client', () => {

  describe('Subscription class', () => {

    beforeEach('create sandbox, create a temporary directory and instantiate a Client and Subscription classes', () => {
      this.sandbox = createSandbox()

      const dir = tmp.dirSync({ dir: __dirname, prefix: 'swordsman-test', unsafeCleanup: true })
      this.dirPath = fs.realpathSync(dir.name)

      this.clientInstance = new client.Client()
      this.subscription = new client.Subscription(this.clientInstance, this.dirPath)

      this.sandbox.stub(this.clientInstance, 'capabilityCheck')

      this.sandbox.spy(this.clientInstance, 'command')
      this.sandbox.spy(this.clientInstance, 'subscriptionAdded')
      this.sandbox.spy(this.clientInstance, 'subscriptionDeleted')
    })

    afterEach('restore sandbox and end client', () => {
      this.sandbox.restore()

      this.clientInstance.end()
    })

    describe('check', () => {

      it('should call capabilityCheck and resolves if everything okay', async () => {
        this.clientInstance.capabilityCheck.callsFake((_options, callback) => callback())

        expect(this.subscription.check()).to.eventually.be.fulfilled
        expect(this.clientInstance.capabilityCheck.called).to.be.true
      })

      it('should call capabilityCheck and rejects if there is an error', async () => {
        this.clientInstance.capabilityCheck.callsFake((_options, callback) => callback('error'))

        expect(this.subscription.check()).to.eventually.be.rejected
        expect(this.clientInstance.capabilityCheck.called).to.be.true
      })

    })

    describe('watch', () => {

      it('should call watch-project command and set root and relativePath', async () => {
        await this.subscription.watch()

        expect(this.clientInstance.command.called).to.be.true
        expect(this.clientInstance.command.args[0][0]).to.deep.equal([
          'watch-project',
          this.dirPath,
        ])

        expect(this.subscription.root).to.not.be.undefined
        expect(this.subscription.relativePath).to.not.be.undefined

        expect(path.join(this.subscription.root, this.subscription.relativePath)).to.equal(this.dirPath)
      })

    })

    describe('subscribe', () => {

      it('should call clock and subscribe command and call subscriptionAdded on client', async () => {
        await this.subscription.watch()
        await this.subscription.subscribe()

        expect(this.clientInstance.command.callCount).to.equal(3)

        // Clock
        expect(this.clientInstance.command.args[1][0]).to.deep.equal([
          'clock',
          this.subscription.root,
        ])

        // Subscribe
        expect(this.clientInstance.command.args[2][0][0]).to.equal('subscribe')
        expect(this.clientInstance.command.args[2][0][1]).to.equal(this.subscription.root)
        expect(this.clientInstance.command.args[2][0][2]).to.equal(this.subscription.subscriptionName)
        expect(this.clientInstance.command.args[2][0][3].relative_root).to.equal(this.subscription.relativePath)
        expect(this.clientInstance.command.args[2][0][3]).to.have.property('since')

        expect(this.clientInstance.subscriptionAdded.called).to.be.true
      })

      it('should call subscribe command with custom query if provided', async () => {
        const customQuery: watchman.Query = { expression: ['type', 'f'] }
        const subscription = new client.Subscription(this.clientInstance, this.dirPath, customQuery)

        await subscription.watch()
        await subscription.subscribe()

        expect(this.clientInstance.command.callCount).to.equal(3)

        // Subscribe
        expect(this.clientInstance.command.args[2][0][0]).to.equal('subscribe')
        expect(this.clientInstance.command.args[2][0][1]).to.equal(subscription.root)
        expect(this.clientInstance.command.args[2][0][2]).to.equal(subscription.subscriptionName)
        expect(this.clientInstance.command.args[2][0][3].relative_root).to.equal(subscription.relativePath)
        expect(this.clientInstance.command.args[2][0][3]).to.have.property('since')
        expect(this.clientInstance.command.args[2][0][3]).to.have.property('expression')

        expect(this.clientInstance.subscriptionAdded.called).to.be.true
      })

    })

    describe('unsubscribe', () => {

      it('should call unsubscribe command and call subscriptionDeleted on client', async () => {
        await this.subscription.watch()
        await this.subscription.subscribe()
        await this.subscription.unsubscribe()

        expect(this.clientInstance.command.callCount).to.equal(4)

        expect(this.clientInstance.command.args[3][0]).to.deep.equal([
          'unsubscribe',
          this.subscription.root,
          this.subscription.subscriptionName,
        ])

        expect(this.clientInstance.subscriptionDeleted.called).to.be.true
      })

    })

  })

  describe('Client class', () => {

    beforeEach('instantiate a Client class', () => {
      this.clientInstance = new client.Client()
    })

    it('should extend watchman.Client', () => {
      expect(this.clientInstance).to.be.an.instanceof(watchman.Client)
    })

    it('should have subscriptionsCount property', () => {
      expect(this.clientInstance).to.have.property('subscriptionsCount')
    })

    describe('subscriptionAdded', () => {

      it('should increment subscriptionsCount', () => {
        this.clientInstance.subscriptionAdded()

        expect(this.clientInstance.subscriptionsCount).to.equal(1)
      })

    })

    describe('subscriptionDeleted', () => {

      beforeEach('create sandbox and stub close', () => {
        this.sandbox = createSandbox()

        this.sandbox.stub(this.clientInstance, 'close')
      })

      afterEach('restore sandbox', () => {
        this.sandbox.restore()
      })

      it('should decrement subscriptionsCount', () => {
        this.clientInstance.subscriptionsCount = 10

        this.clientInstance.subscriptionDeleted()

        expect(this.clientInstance.subscriptionsCount).to.equal(9)
      })

      it('should close client if subscriptionsCount is zero', () => {
        this.clientInstance.subscriptionDeleted()

        expect(this.clientInstance.close.called).to.be.true
      })

      it('should not close client if subscriptionsCount is greater than zero', () => {
        this.clientInstance.subscriptionsCount = 10

        this.clientInstance.subscriptionDeleted()

        expect(this.clientInstance.close.called).to.be.false
      })

    })

    describe('close', () => {

      beforeEach('create sandbox, stub removeAllListeners and end', () => {
        this.sandbox = createSandbox()

        this.sandbox.stub(this.clientInstance, 'removeAllListeners')
        this.sandbox.stub(this.clientInstance, 'end')
      })

      afterEach('restore sandbox', () => {
        this.sandbox.restore()
      })

      it('should call removeAllListeners and end', () => {
        this.clientInstance.close()

        expect(this.clientInstance.removeAllListeners.called).to.be.true
        expect(this.clientInstance.end.called).to.be.true
      })

    })

  })

  describe('getClientInstance', () => {

    beforeEach('create sandbox and spy Client constructor', () => {
      this.sandbox = createSandbox()

      this.sandbox.spy(client.Client.prototype, 'constructor')
    })

    afterEach('restore sandbox', () => {
      this.sandbox.restore()
    })

    it('should instantiate Client only once if already seen', () => {
      const clientInstance = client.getClientInstance()
      expect(clientInstance).to.be.an.instanceof(client.Client)

      const clientInstance2 = client.getClientInstance()
      expect(clientInstance2).to.be.an.instanceof(client.Client)

      expect(clientInstance).to.equal(clientInstance2) // Same object instance
    })

    it('should instantiate Client with provided watchmanBinaryPath', () => {
      const clientInstance = client.getClientInstance('/path')
      expect(clientInstance).to.be.an.instanceof(client.Client)
      expect(clientInstance.watchmanBinaryPath).to.equal('/path')
    })

    it('should instantiate Client with provided watchmanBinaryPath only once', () => {
      const clientInstance = client.getClientInstance('/path')
      expect(clientInstance).to.be.an.instanceof(client.Client)

      const clientInstance2 = client.getClientInstance('/path')
      expect(clientInstance2).to.be.an.instanceof(client.Client)

      expect(clientInstance).to.equal(clientInstance2) // Same object instance
    })

  })

})
