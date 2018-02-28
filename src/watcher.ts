import { EventEmitter } from 'events'
import * as watchman from 'fb-watchman'
import { lstat, Stats } from 'fs'
import { join } from 'path'

import { Client, getClientInstance, Subscription } from './client'

export enum WatcherEvent {
  READY = 'ready',
  END = 'end',
  ERROR = 'error',
  ALL = 'all',
  ADD = 'add',
  CHANGE = 'change',
  DELETE = 'delete',
}

export class Watcher extends EventEmitter {

  public path: string
  public query: watchman.Query

  private client: Client
  private subscription: Subscription
  private watchmanBinaryPath?: string

  constructor(path: string, query?: watchman.Query, watchmanBinaryPath?: string) {
    super()

    this.path = path
    this.query = query

    this.watchmanBinaryPath = watchmanBinaryPath

    this.initiateWatch()

    return this
  }

  public async close(): Promise<void> {
    try {
      await this.subscription.unsubscribe()
    } catch (error) {
      this.emit(WatcherEvent.ERROR, error.message)
    }
  }

  private async initiateWatch(): Promise<void> {
    try {
      await this.createSubscription()

      this.attachEndListener()
      this.attachErrorListener()
      this.attachSubscriptionListener()

      this.emit(WatcherEvent.READY)
    } catch (error) {
      this.handleError(error)
    }
  }

  private async createSubscription(): Promise<void> {
    this.client = getClientInstance(this.watchmanBinaryPath)
    this.subscription = new Subscription(this.client, this.path)

    await this.subscription.watch()
    await this.subscription.subscribe()
  }

  private attachEndListener(): void {
    // Watchman has ended connection unilaterally, try to reconnect
    this.client.on('end', async () => {
      try {
        await this.createSubscription()
      } catch (error) {
        this.handleError(error)
      }
    })
  }

  private attachErrorListener(): void {
    this.client.on('error', (error: Error) => {
      this.handleError(error)
    })
  }

  private attachSubscriptionListener(): void {
    this.client.on('subscription', (event: watchman.SubscriptionEvent) => {
      if (event.subscription !== this.subscription.subscriptionName) {
        return
      }

      if (Array.isArray(event.files)) {
        event.files.forEach(this.handleFileChange)
      }
    })
  }

  private handleFileChange(file: watchman.File): void {
    const absolutePath = join(this.subscription.root, file.name)

    if (!file.exists) {
      this.emitFileEvent(WatcherEvent.DELETE, absolutePath)
    } else {
      lstat(absolutePath, (error, stats: Stats) => {
        if (error) {
          // File may have been deleted between the event and lstat
          // Ignore the event if it's the case, handle other errors
          if (error.code !== 'ENOENT') {
            this.handleError(error)
          }

          return
        }

        const event = file.new ? WatcherEvent.ADD : WatcherEvent.CHANGE
        this.emitFileEvent(event, absolutePath, stats)
      })
    }
  }

  private emitFileEvent(event: WatcherEvent, path: string, stats?: Stats) {
    this.emit(event, path, stats)
    this.emit(WatcherEvent.ALL, path, stats)
  }

  private handleError(error: Error): void {
    this.emit(WatcherEvent.ERROR, error.message)
  }

}
