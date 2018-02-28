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

/**
 * Service that watch a directory on a file system and notifies file additions, changes and deletions.
 */
export class Watcher extends EventEmitter {

  /**
   * Path of the watched directory.
   */
  public path: string

  /**
   * A Watchman query to filter the files being watched.
   */
  public query: watchman.Query

  private client: Client
  private subscription: Subscription
  private watchmanBinaryPath?: string

  /**
   * Initiates a watch on a directory.
   *
   * @param path - Path of the watched directory.
   * @param query - A Watchman query to filter the files being watched.
   * @param watchmanBinaryPath - Path to the Watchman binary.
   */
  constructor(path: string, query?: watchman.Query, watchmanBinaryPath?: string) {
    super()

    this.path = path
    this.query = query

    this.watchmanBinaryPath = watchmanBinaryPath

    // tslint:disable-next-line:no-floating-promises
    this.initiateWatch()

    return this
  }

  /**
   * Closes the watcher.
   *
   * @returns Close operation.
   */
  public async close(): Promise<void> {
    try {
      await this.subscription.unsubscribe()
    } catch (error) {
      this.emit(WatcherEvent.ERROR, error.message)
    }
  }

  private async initiateWatch(): Promise<void> {
    try {
      this.createSubscription()

      // Attach listeners before launching subscription
      // So that we do not miss any event
      this.attachEndListener()
      this.attachErrorListener()
      this.attachSubscriptionListener()

      await this.launchSubscription()

      this.emit(WatcherEvent.READY)
    } catch (error) {
      this.handleError(error)
    }
  }

  private createSubscription(): void {
    this.client = getClientInstance(this.watchmanBinaryPath)
    this.subscription = new Subscription(this.client, this.path)
  }

  private async launchSubscription(): Promise<void> {
    await this.subscription.watch()
    await this.subscription.subscribe()
  }

  private attachEndListener(): void {
    // Watchman has ended connection unilaterally, try to reconnect
    const endCallback = async () => {
      try {
        this.createSubscription()

        // Don't attach listeners again

        await this.launchSubscription()
      } catch (error) {
        this.handleError(error)
      }
    }
    this.client.on('end', endCallback.bind(this))
  }

  private attachErrorListener(): void {
    const errorCallback = (error: Error) => {
      this.handleError(error)
    }
    this.client.on('error', errorCallback.bind(this))
  }

  private attachSubscriptionListener(): void {
    const subscriptionCallback = (event: watchman.SubscriptionEvent) => {
      if (event.subscription !== this.subscription.subscriptionName) {
        return
      }

      if (Array.isArray(event.files)) {
        event.files.forEach(this.handleFileChange.bind(this))
      }
    }
    this.client.on('subscription', subscriptionCallback.bind(this))
  }

  private handleFileChange(file: watchman.File): void {
    const absolutePath = join(this.subscription.root, this.subscription.relativePath, file.name)

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
