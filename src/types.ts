import type { BaseLogger } from './base-logger'
import type { LOG_LEVEL_NAMES, LogLevel } from './constants'
import type { Transport } from './transports'

export interface LogEntryMetadata {
    timer?: bigint
}

export interface LogEntry {
    timestamp: Date
    level: number
    icon?: string
    message?: string
    context: any[]
    errors: Error[]
    metadata: LogEntryMetadata
    instance?: BaseLogger<any>
    exclude?: {
        transformers?: LogTransformer[]
        transports?: Transport[]
    }
}

export type LogLevelName = Extract<typeof LOG_LEVEL_NAMES[keyof typeof LOG_LEVEL_NAMES], string>

export type LogLevelType = LogLevel | LogLevelName

export interface LogFilterContext {
    logger: BaseLogger<any>
    level: number
    message?: any
    context: any[]
}

export type LogFilter = (context: LogFilterContext) => boolean

export type LogTransformer = (entry: LogEntry, logger: BaseLogger<any>) => LogEntry | false | null | undefined
