import * as watchman from 'fb-watchman'
import * as watcher from '../../src/watcher'

export const createWatcher = async (path: string, query?: watchman.Query, options?: watcher.WatcherOptions): Promise<watcher.Watcher> => {
  const watcherInstance = new watcher.Watcher(path, query, options)

  // Wait for the watcher to be ready
  await new Promise((resolve, reject) => {
    watcherInstance.on(watcher.WatcherEvent.READY, resolve)
    watcherInstance.on(watcher.WatcherEvent.ERROR, (error) => {
      reject(error)
    })
  })

  return watcherInstance
}
