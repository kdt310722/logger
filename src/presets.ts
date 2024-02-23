import { resolveNestedOptions } from '@kdt310722/utils/object'
import { isString } from '@kdt310722/utils/string'
import { LogLevel } from './constants'
import { type DebugOptions, debug } from './filters'
import { Logger, type LoggerOptions } from './logger'
import { FileTransport, type FileTransportOptions, TelegramTransport, type TelegramTransportOptions } from './transports'
import type { LogLevelType } from './types'

export interface DefaultLoggerOptions extends LoggerOptions {
    debug?: Omit<DebugOptions, 'level'> & { level?: LogLevelType } | boolean
    file?: Omit<FileTransportOptions, 'level'> & { path: string, level?: LogLevelType } | string
    telegram?: Omit<TelegramTransportOptions, 'level'> & { level?: LogLevelType }
}

export function createDefaultLogger(options: DefaultLoggerOptions = {}) {
    const logger = new Logger(options)
    const debugOptions = resolveNestedOptions(options.debug ?? true)

    if (debugOptions) {
        logger.addFilter(debug({
            ...debugOptions,
            filter: debugOptions.filter ?? (process.env.LOG_DEBUG ?? '-*'),
            level: logger.levelResolver(debugOptions.level ?? LogLevel.DEBUG),
        }))
    }

    if (options.file) {
        let path: string
        let fileOptions: FileTransportOptions

        if (isString(options.file)) {
            path = options.file
            fileOptions = {}
        } else {
            path = options.file.path
            fileOptions = { ...options.file, level: logger.levelResolver(options.file.level ?? LogLevel.ERROR) }
        }

        logger.addTransport(new FileTransport(path, fileOptions))
    }

    if (options.telegram) {
        logger.addTransport(new TelegramTransport({ ...options.telegram, level: logger.levelResolver(options.telegram.level ?? LogLevel.ERROR) }))
    }

    return logger
}
