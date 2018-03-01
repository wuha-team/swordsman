import * as watchman from 'fb-watchman'
import { v1 as uuid } from 'uuid'

/**
 * Represents a Watchman subscription
 */
export class Subscription {

  /**
   * Root path that Watchman watches.
   */
  public root: string

  /**
   * Relative path from {@link root} to the watched directory.
   */
  public relativePath: string

  /**
   * Name of the subscription in Watchman. Automatically generated UUID.
   */
  public subscriptionName: string

  /**
   * A Watchman query to filter the files being watched.
   */
  public query?: watchman.Query

  private client: Client

  /**
   * Creates a Subscription.
   *
   * @param client - Watchman client instance.
   * @param path - Path to the watched directory.
   */
  constructor(client: Client, path: string, query?: watchman.Query) {
    this.root = path
    this.query = query
    this.subscriptionName = uuid()

    this.client = client
  }

  /**
   * Starts the watch on Watchman.
   *
   * @returns Start watch operation.
   */
  public watch(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      this.client.command([ 'watch-project', this.root ], (error, response) => {
        if (error) {
          reject(error)
        } else {
          this.root = response.watch
          this.relativePath = response.relative_path ? response.relative_path : ''
          resolve()
        }
      })
    })
  }

  /**
   * Subscribes to changes on Watchman.
   *
   * @returns Subscription operation.
   */
  public subscribe(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.command([ 'clock', this.root ], (clockErr, clockResponse) => {
        if (clockErr) {
          reject(clockErr)
        } else {

          this.client.command(
            [
              'subscribe',
              this.root,
              this.subscriptionName,
              this.getSubscriptionQuery(clockResponse.clock),
            ],
            (subscribeErr) => {
              if (subscribeErr) {
                reject(subscribeErr)
              } else {
                this.client.subscriptionAdded()
                resolve()
              }
            },
          )
        }
      })
    })
  }

  /**
   * Runs a query on this subscription and send an event for the existing files.
   *
   * @returns Query operation
   */
  public runQuery(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.command([ 'query', this.root, this.getSubscriptionQuery() ], (error, response) => {
        if (error) {
          reject(error)
        } else {
          const subscriptionEvent: watchman.SubscriptionEvent = {
            root: this.root,
            subscription: this.subscriptionName,
            version: response.version,
            clock: response.clock,
            files: response.files,
          }
          this.client.emit('subscription', subscriptionEvent)
          resolve()
        }
      })
    })
  }

  /**
   * Unsubscribes from Watchman.
   *
   * @returns Unsubscription operation.
   */
  public unsubscribe(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.command([ 'unsubscribe', this.root, this.subscriptionName ], (error) => {
        if (error) {
          reject(error)
        } else {
          this.client.subscriptionDeleted()
          resolve()
        }
      })
    })
  }

  private getSubscriptionQuery(clock?: string): watchman.Query {
    return {
      relative_root: this.relativePath,
      ...clock ? { since: clock } : {},
      ...this.query,
    }
  }

}

const clientInstances = new Map<string, Client>()

/**
 * Represents a watchman client.
 *
 * @extends watchman.Client
 */
export class Client extends watchman.Client {

  /**
   * Number of subscriptions associated to this client.
   */
  public subscriptionsCount: number = 0

  /**
   * Increments the subscription count
   */
  public subscriptionAdded(): void {
    this.subscriptionsCount = this.subscriptionsCount + 1
  }

  /**
   * Decrements the subscription count.
   * If the subscription count falls to zero, the client is closed.
   */
  public subscriptionDeleted(): void {
    this.subscriptionsCount = this.subscriptionsCount - 1

    if (this.subscriptionsCount <= 0) {
      this.removeAllListeners()
      this.end()

      clientInstances.delete(this.watchmanBinaryPath ? this.watchmanBinaryPath : 'default')
    }
  }
}

/**
 * Returns a Watchman client instance.
 * Instantiates a new client only if it has not been seen yet.
 *
 * @param watchmanBinaryPath - Path to the Watchman binary.
 */
export const getClientInstance = (watchmanBinaryPath?: string): Client => {
  const clientKey = watchmanBinaryPath ? watchmanBinaryPath : 'default'

  if (clientInstances[clientKey]) {
    return clientInstances[clientKey]
  }

  const clientInstance = new Client(watchmanBinaryPath ? { watchmanBinaryPath } : {})
  clientInstances[clientKey] = clientInstance

  return clientInstance
}
