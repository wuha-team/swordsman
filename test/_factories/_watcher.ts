import * as watchman from 'fb-watchman'
import * as watcher from '../../src/watcher'

export const createWatcher = async (path: string, query?: watchman.Query, options?: watcher.WatcherOptions) => {
  return new Promise<watcher.Watcher>((resolve, reject) => {
    const watcherInstance = new watcher.Watcher(path, query, options)

    // Wait for the watcher to be ready
    watcherInstance.on(watcher.WatcherEvent.READY, () => resolve(watcherInstance))
    watcherInstance.on(watcher.WatcherEvent.ERROR, (error) => {
      reject(error)
    })
  })
}
