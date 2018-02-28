import * as watchman from 'fb-watchman'
import { v1 as uuid } from 'uuid'

export class Subscription {

  public root: string
  public relativePath: string
  public subscriptionName: string

  private client: Client

  constructor(client: Client, path: string) {
    this.root = path
    this.subscriptionName = uuid()

    this.client = client
  }

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

export class Client extends watchman.Client {

  public subscriptionsCount: number = 0

  public subscriptionAdded(): void {
    this.subscriptionsCount = this.subscriptionsCount + 1
  }

  public subscriptionDeleted(): void {
    this.subscriptionsCount = this.subscriptionsCount - 1

    if (this.subscriptionsCount <= 0) {
      this.removeAllListeners()
      this.end()

      clientInstances.delete(this.watchmanBinaryPath ? this.watchmanBinaryPath : 'default')
    }
  }
}

const clientInstances = new Map<string, Client>()

export const getClientInstance = (watchmanBinaryPath?: string): Client => {
  const clientKey = watchmanBinaryPath ? watchmanBinaryPath : 'default'

  if (clientInstances[clientKey]) {
    return clientInstances[clientKey]
  }

  const clientInstance = new Client(watchmanBinaryPath ? { watchmanBinaryPath } : {})
  clientInstances[clientKey] = clientInstance

  return clientInstance
}
