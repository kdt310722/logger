import { isNumber } from '@kdt310722/utils/number'
import { map } from '@kdt310722/utils/object'
import { BaseLogger, type BaseLoggerOptions } from './base-logger'
import { LOG_LEVEL_COLORS, LOG_LEVEL_NAMES, LogLevel } from './constants'
import type { PrettierOptions } from './prettiers'
import type { LogLevelType } from './types'
import { Loading, type LoadingOptions, ProgressBar, type ProgressBarOptions, exit } from './utils'

export type LoggerOptions = Omit<BaseLoggerOptions<LogLevelType>, 'errorLevels' | 'fatalLevel' | 'levelResolver' | 'prettier'> & {
    prettier?: Omit<PrettierOptions, 'levels' | 'colors'>
    handleExit?: boolean
}

export interface ChildLoggerOptions extends LoggerOptions {
    mergeFilters?: boolean
    mergeTransformers?: boolean
    mergeTransports?: boolean
}

export class Logger extends BaseLogger<LogLevelType> {
    public constructor(protected readonly options: LoggerOptions = {}) {
        const levels = map(LOG_LEVEL_NAMES, (level, name) => [name, level])
        const { handleExit = true, ...restOptions } = options

        super({
            ...restOptions,
            errorLevels: [LogLevel.ERROR, LogLevel.FATAL],
            fatalLevel: LogLevel.FATAL,
            levelResolver: (level) => (isNumber(level) ? level : (levels[level] ?? Number.NEGATIVE_INFINITY)),
            prettier: { ...options.prettier, levels, colors: LOG_LEVEL_COLORS },
        })

        if (handleExit) {
            this.handleExit()
        }
    }

    public child(options: ChildLoggerOptions = {}) {
        const { mergeFilters = true, mergeTransformers = true, mergeTransports = true, filters: childFilters = [], transformers: childTransformers = [], transports: childTransports = [], prettier = {}, ...childOptions } = options
        const filters = mergeFilters ? [...this.filters, ...childFilters] : childFilters
        const transformers = mergeTransformers ? [...this.transformers, ...childTransformers] : childTransformers
        const transports = mergeTransports ? [...this.transports, ...childTransports] : childTransports

        return new (this.constructor as typeof Logger)({
            ...this.options,
            ...childOptions,
            filters,
            transformers,
            transports,
            prettier: { ...this.options.prettier, ...prettier },
            handleExceptions: false,
            handleRejections: false,
            handleExit: false,
        })
    }

    public trace(message?: any, ...context: any[]) {
        return this.log(LogLevel.TRACE, message, ...context)
    }

    public debug(message?: any, ...context: any[]) {
        return this.log(LogLevel.DEBUG, message, ...context)
    }

    public info(message?: any, ...context: any[]) {
        return this.log(LogLevel.INFO, message, ...context)
    }

    public warn(message?: any, ...context: any[]) {
        return this.log(LogLevel.WARN, message, ...context)
    }

    public error(message?: any, ...context: any[]) {
        return this.log(LogLevel.ERROR, message, ...context)
    }

    public fatal(message?: any, ...context: any[]) {
        return this.log(LogLevel.FATAL, message, ...context)
    }

    public createLoading(options: LoadingOptions = {}) {
        return new Loading(this, options)
    }

    public createProgressBar(total: number, options: ProgressBarOptions = {}) {
        return new ProgressBar(this, total, options)
    }

    protected handleExit() {
        process.on('SIGTERM', () => exit(this))
        process.on('SIGINT', () => exit(this))
    }
}
