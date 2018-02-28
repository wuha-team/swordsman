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

  private client: Client

  /**
   * Creates a Subscription.
   *
   * @param client - Watchman client instance.
   * @param path - Path to the watched directory.
   */
  constructor(client: Client, path: string) {
    this.root = path
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
  public subscribe(query?: watchman.Query): Promise<void> {
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
              this.getSubscriptionQuery(clockResponse.clock, query),
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

  private getSubscriptionQuery(clock: string, query?: watchman.Query): watchman.Query {
    return { since: clock, relative_root: this.relativePath, ...query }
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
