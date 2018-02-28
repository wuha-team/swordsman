declare module 'fb-watchman' {

  import { EventEmitter } from 'events'

  type Capability =
    'scm-hg' |
    'cmd-debug-fsevents-inject-drop' |
    'term-empty' |
    'field-name' |
    'field-gid' |
    'field-type' |
    'cmd-get-pid' |
    'field-mtime_us' |
    'field-size' |
    'field-exists' |
    'field-mtime_ns' |
    'field-ino' |
    'field-dev' |
    'term-since' |
    'field-ctime' |
    'field-mtime_ms' |
    'field-mode' |
    'field-atime_ms' |
    'field-ctime_f' |
    'field-uid' |
    'field-ctime_us' |
    'field-atime_us' |
    'field-atime_ns' |
    'field-new' |
    'field-oclock' |
    'field-cclock' |
    'term-iname' |
    'term-ipcre' |
    'field-ctime_ns' |
    'term-pcre' |
    'field-nlink' |
    'wildmatch' |
    'field-symlink_target' |
    'field-content.sha1hex' |
    'term-imatch' |
    'field-atime_f' |
    'term-match' |
    'wildmatch-multislash' |
    'term-suffix' |
    'term-name' |
    'term-size' |
    'glob_generator' |
    'scm-since' |
    'relative_root' |
    'term-allof' |
    'term-anyof' |
    'term-false' |
    'term-true' |
    'field-atime' |
    'cmd-debug-drop-privs' |
    'cmd-shutdown-server' |
    'field-mtime' |
    'cmd-debug-poison' |
    'cmd-debug-ageout' |
    'cmd-debug-show-cursors' |
    'cmd-debug-recrawl' |
    'cmd-watch' |
    'term-type' |
    'term-idirname' |
    'cmd-watch-list' |
    'cmd-debug-get-subscriptions' |
    'cmd-watch-del-all' |
    'cmd-debug-set-subscriptions-paused' |
    'cmd-clock' |
    'clock-sync-timeout' |
    'cmd-trigger' |
    'cmd-trigger-list' |
    'cmd-trigger-del' |
    'cmd-watch-project' |
    'cmd-subscribe' |
    'cmd-unsubscribe' |
    'cmd-flush-subscriptions' |
    'cmd-state-leave' |
    'cmd-state-enter' |
    'term-dirname' |
    'cmd-since' |
    'cmd-query' |
    'cmd-watch-del' |
    'cmd-log' |
    'cmd-log-level' |
    'term-exists' |
    'dedup_results' |
    'cmd-get-config' |
    'cmd-get-sockname' |
    'cmd-list-capabilities' |
    'field-mtime_f' |
    'cmd-version' |
    'field-ctime_ms' |
    'cmd-find' |
    'term-not' |
    'bser-v2' |
    'cmd-debug-contenthash'

  // Expression language

  type ComparisonOperator =
    'eq' |
    'ne' |
    'gt' |
    'ge' |
    'lt' |
    'le'

  type MatchScope =
    'basename' |
    'wholenale'|
    'filename'

  type MatchFlags = 'includedotfiles' | 'noescape'

  type FileType =
    'b' |
    'c' |
    'd' |
    'f' |
    'p' |
    'l' |
    's' |
    'D'

  interface CompoundExpression {
    [0]: 'allof' | 'anyof'
    [1]: Expression
    [2]?: Expression
    [3]?: Expression
    [4]?: Expression
    [5]?: Expression
    [6]?: Expression
    [7]?: Expression
    [8]?: Expression
    [9]?: Expression
    [10]?: Expression
  }

  interface NotExpression {
    [0]: 'not'
    [1]: Expression
  }

  interface DirnameExpression {
    [0]: 'dirname' | 'idirname'
    [1]: string
    [2]?: [ 'depth', ComparisonOperator, number ]
  }

  interface EmptyExistsExpression {
    [0]: 'empty' | 'exists'
  }

  interface MatchExpression {
    [0]: 'match' | 'imatch'
    [1]: string
    [2]?: MatchScope
    [3]?: { [key in MatchFlags]: boolean }
  }

  interface NameExpression {
    [0]: 'name' | 'iname'
    [1]: string | string[]
    [2]?: MatchScope
  }

  interface PcreExpression {
    [0]: 'pcre' | 'ipcre'
    [1]: string
    [2]?: MatchScope
  }

  interface SinceExpression {
    [0]: 'since'
    [1]: string | number
    [2]?: [ 'mtime', 'ctime', 'oclock', 'cclock' ]
  }

  interface SizeExpression {
    [0]: 'size'
    [1]: ComparisonOperator
    [2]: number
  }

  interface SuffixExpression {
    [0]: 'suffix'
    [1]: string | string[]
  }

  interface TypeExpression {
    [0]: 'type'
    [1]: FileType
  }

  export type Expression =
    CompoundExpression |
    NotExpression |
    DirnameExpression |
    EmptyExistsExpression |
    MatchExpression |
    NameExpression |
    PcreExpression |
    SinceExpression |
    SizeExpression |
    SuffixExpression |
    TypeExpression

  interface PathGenerator {
    path: string
    depth: number
  }

  export type Fields =
    'name' |
    'exists' |
    'cclock' |
    'oclock' |
    'ctime' | 'ctime_ms' | 'ctime_us' | 'ctime_ns' | 'ctime_f' |
    'mtime' | 'mtime_ms' | 'mtime_us' | 'mtime_ns' | 'mtime_f' |
    'size' |
    'mode' |
    'uid' |
    'gid' |
    'ino' |
    'dev' |
    'nlink' |
    'new' |
    'type' |
    'symlink_target'

  export interface Query {
    since?: string
    suffix?: string | string[]
    glob?: string[]
    path?: string[] | PathGenerator
    expression?: Expression
    fields?: Fields[]
    relative_root?: string
    dedup_results?: boolean
    lock_timeout?: number
    sync_timeout?: number
    case_sensitive?: boolean
  }

  // Commands

  type CommandArguments =
    ClockArguments |
    FindArguments |
    FlushSubscriptionsArguments |
    GetConfigArguments |
    GetSocknameArguments |
    LogArguments |
    LogLevelArguments |
    QueryArguments |
    ShutdownServerArguments |
    SinceArguments |
    StateEnterArguments |
    StateLeaveArguments |
    SubscribeArguments |
    UnsubscribeArguments |
    VersionArguments |
    WatchArguments |
    WatchDelArguments |
    WatchListArguments |
    WatchProjectArguments

  interface CommandResponse {
    version: string
  }

  // Clock
  export type ClockArguments = [ 'clock', string ] | [ 'clock', string, { sync_timeout: boolean } ]

  interface ClockResponse extends CommandResponse {
    clock: string
  }

  // Find
  export type FindArguments = [ 'find', string ] | [ 'find', string, string | string[] ]

  // FlushSubscriptions
  export type FlushSubscriptionsArguments = [ 'flush-subscriptions', string, { sync_timeout: boolean ; subscriptions?: string[] } ]

  // GetConfig
  export type GetConfigArguments = [ 'get-config', string ]

  // GetSockname
  export type GetSocknameArguments = [ 'get-sockname' ]

  // Log
  export type LogArguments = [ 'log', string, string ]

  // LogLevel
  export type LogLevelArguments = [ 'log-level', 'debug' | 'error' | 'off' ]

  // Query
  export type QueryArguments = [ 'query', string, Query ]

  interface File {
    name?: string
    exists?: boolean
    cclock?: string
    oclock?: string

    ctime?: number
    ctime_ms?: number
    ctime_us?: number
    ctime_ns?: number
    ctime_f?: number

    mtime?: number
    mtime_ms?: number
    mtime_us?: number
    mtime_ns?: number
    mtime_f?: number

    size?: number
    mode?: number
    uid?: number
    gid?: number
    ino?: number
    dev?: number
    nlink?: number
    new?: boolean
    type?: FileType
    symlink_target: string
  }

  interface QueryResponse extends CommandResponse {
    clock: string,
    is_fresh_instance: boolean,
    files: File[]
  }

  // ShutdownServer
  export type ShutdownServerArguments = [ 'shutdown-server' ]

  // Since
  export type SinceArguments = [ 'since', string, string ] | [ 'since', string, string, string | string[] ]

  // StateEnter
  export type StateEnterArguments = [ 'state-enter', string, string ]

  // StateLeave
  export type StateLeaveArguments = [ 'state-leave', string, string ]

  // Subscribe
  export type SubscribeArguments = [ 'subscribe', string, string, Query ]

  interface SubscribeResponse extends CommandResponse {
    subscribe: string
  }

  export interface SubscriptionEvent {
    version: string
    clock: string
    root: string
    subscription: string
    files: File[]
  }

  // Unsubscribe
  export type UnsubscribeArguments = [ 'unsubscribe', string, string ]

  // Version
  export type VersionArguments = [ 'version' ] | [ 'version', VersionOptions ]

  export interface VersionOptions {
    optional: Capability[]
    required: Capability[]
  }

  interface VersionResponse extends CommandResponse {
    capabilities: {
      [key in Capability]: boolean
    }
  }

  // Watch
  export type WatchArguments = [ 'watch', string ]

  // WatchDel
  export type WatchDelArguments = [ 'watch-del', string ]

  // WatchDelAll
  export type WatchDelAllArguments = [ 'watch-del-all' ]

  // WatchList
  export type WatchListArguments = [ 'watch-list' ]

  // WatchProject
  export type WatchProjectArguments = [ 'watch-project', string ]

  interface WatchProjectResponse extends CommandResponse {
    watch: string
    relative_path?: string
  }

  type commandCallback<T extends CommandResponse> = (error: Error, response: T) => void

  interface ClientOptions {
    watchmanBinaryPath?: string
  }

  export class Client extends EventEmitter {

    public watchmanBinaryPath?: string

    public constructor(options?: ClientOptions)

    public capabilityCheck(options: VersionOptions, callback: commandCallback<VersionResponse>): void

    public command(args: ClockArguments, callback?: commandCallback<ClockResponse>): void
    public command(args: QueryArguments, callback?: commandCallback<QueryResponse>): void
    public command(args: SubscribeArguments, callback?: commandCallback<SubscribeResponse>): void
    public command(args: VersionArguments, callback?: commandCallback<VersionResponse>): void
    public command(args: WatchProjectArguments, callback?: commandCallback<WatchProjectResponse>): void
    public command(args: CommandArguments | UnsubscribeArguments, callback?: commandCallback<CommandResponse>): void

    public end(): void

  }

}
