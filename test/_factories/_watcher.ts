import * as watchman from 'fb-watchman'
import * as watcher from '../../src/watcher'

export const createWatcher = async (path: string, query?: watchman.Query): Promise<watcher.Watcher> => {
  const watcherInstance = new watcher.Watcher(path, query)

  // Wait for the watcher to be ready
  await new Promise((resolve) => {
    watcherInstance.on(watcher.WatcherEvent.READY, resolve)
    watcherInstance.on(watcher.WatcherEvent.ERROR, (error) => {
      console.error(error)
    })
  })

  return watcherInstance
}
