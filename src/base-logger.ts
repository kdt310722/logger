import { EOL } from 'node:os'
import { unique } from '@kdt310722/utils/array'
import { notNullish, notUndefined } from '@kdt310722/utils/common'
import { tap } from '@kdt310722/utils/function'
import { gracefulExit } from '@kdt310722/utils/node'
import { isNumber } from '@kdt310722/utils/number'
import { isKeyOf, isObject } from '@kdt310722/utils/object'
import { isString } from '@kdt310722/utils/string'
import stripAnsi from 'strip-ansi'
import { LOG_INPUT, LOG_LAZY_CONTEXT, LOG_LAZY_MESSAGE } from './constants'
import { TransformError, TransportError, UnhandledRejectionError } from './errors'
import type { PrettierOptions } from './prettiers'
import { Prettier } from './prettiers'
import type { Transport } from './transports'
import type { LogEntry, LogFilter, LogTransformer } from './types'
import { incrementCtrlCCount, mergeEntry } from './utils'

export interface GracefulExitOptions {
    code?: number
    maxWaitTime?: number
}

export interface BaseLoggerOptions<TLevel = number> {
    errorLevels: number[]
    fatalLevel: TLevel
    enabled?: boolean
    level?: TLevel
    levelResolver?: (level: any) => number
    name?: string
    filters?: LogFilter[]
    transformers?: LogTransformer[]
    transports?: Transport[]
    prettier?: PrettierOptions
    forceExitOnException?: boolean
}

export class BaseLogger<TLevel = number> {
    public readonly levelResolver: (level: any) => number
    public readonly fatalLevel: TLevel
    public readonly name?: string
    public readonly prettier: Prettier

    public isEnabled: boolean
    public level: number

    protected readonly errorLevels: number[]
    protected readonly timers = new Map<string, bigint>()

    protected filters: LogFilter[]
    protected transformers: LogTransformer[]
    protected transports: Transport[]
    protected timerIncrementId = 0
    protected forceExitOnException: boolean

    public constructor(options: BaseLoggerOptions<TLevel>) {
        const { errorLevels, fatalLevel, enabled = true, level = Number.NEGATIVE_INFINITY, name, filters = [], transformers = [], transports = [], prettier = {}, forceExitOnException = false } = options

        this.levelResolver = options.levelResolver ?? ((level: any) => (isNumber(level) ? level : Number.NEGATIVE_INFINITY))
        this.errorLevels = unique([...errorLevels, this.levelResolver(fatalLevel)])
        this.fatalLevel = fatalLevel
        this.isEnabled = enabled
        this.level = this.levelResolver(level)
        this.name = name
        this.filters = unique(filters)
        this.transformers = unique(transformers)
        this.transports = transports
        this.prettier = new Prettier(prettier)
        this.forceExitOnException = forceExitOnException
    }

    public enable() {
        return tap(this, () => (this.isEnabled = true))
    }

    public disable() {
        return tap(this, () => (this.isEnabled = false))
    }

    public setLevel(level: TLevel) {
        return tap(this, () => (this.level = this.levelResolver(level)))
    }

    public addFilter(filter: LogFilter) {
        return tap(this, () => (this.filters = unique([...this.filters, filter])))
    }

    public removeFilter(filter: LogFilter) {
        return tap(this, () => (this.filters = this.filters.filter((t) => t !== filter)))
    }

    public addTransformer(transformer: LogTransformer) {
        return tap(this, () => (this.transformers = unique([...this.transformers, transformer])))
    }

    public removeTransformer(transformer: LogTransformer) {
        return tap(this, () => (this.transformers = this.transformers.filter((t) => t !== transformer)))
    }

    public addTransport(transport: Transport) {
        return tap(this, () => (this.transports = unique([...this.transports, transport])))
    }

    public removeTransport(transport: Transport) {
        return tap(this, () => (this.transports = this.transports.filter((t) => t !== transport)))
    }

    public createTimer(id?: string) {
        return tap(isString(id) ? id : `timer-${++this.timerIncrementId}`, (timerId) => this.timers.set(timerId, process.hrtime.bigint()))
    }

    public stopTimer(id: string, level?: TLevel, message?: any, ...context: any[]) {
        const hrtime = process.hrtime.bigint()
        const elapsed = this.timers.get(id)
        const result = elapsed ? hrtime - elapsed : 0n

        this.timers.delete(id)

        if (notNullish(level)) {
            this.log(level, message, { [LOG_INPUT]: true, metadata: { timer: result } }, ...context)
        }

        return result
    }

    public exit(code?: number | GracefulExitOptions, level?: TLevel, message?: any, ...context: any[]) {
        if (notNullish(level)) {
            this.log(level, message, ...context)
        }

        let exitCode: number | undefined
        let maxWaitTime: number | undefined

        if (isNumber(code)) {
            exitCode = code
        } else {
            exitCode = code?.code
            maxWaitTime = code?.maxWaitTime
        }

        incrementCtrlCCount()
        gracefulExit(exitCode, maxWaitTime)
    }

    public forceExit(code = 0, level?: TLevel, message?: any, ...context: any[]) {
        if (notNullish(level)) {
            this.log(level, message, ...context)
        }

        return process.exit(code)
    }

    public isLevelEnabled(level: number) {
        return this.isEnabled && level >= this.level
    }

    public isLoggable(level: number, message?: any, ...context: any[]) {
        return this.filters.every((filter) => filter({ logger: this, level, message, context }))
    }

    public log(level: TLevel, message?: any, ...context: any[]) {
        const _level = this.levelResolver(level)

        if (!this.isLevelEnabled(_level) || !this.isLoggable(_level, message, ...context)) {
            return
        }

        const entry = this.transformEntry(this.transformers, this.toLogEntry(_level, message, ...context))

        if (!entry) {
            return
        }

        this.write(entry)

        for (const transport of this.transports) {
            if (entry.exclude?.transports?.includes(transport)) {
                continue
            }

            this.writeToTransport(transport, entry)
        }
    }

    public transformEntry(transformers: LogTransformer[], entry: LogEntry) {
        let logEntry: LogEntry | undefined = entry

        for (const transformer of transformers) {
            if (entry.exclude?.transformers?.includes(transformer)) {
                continue
            }

            logEntry = this.applyTransformer(transformer, entry)
        }

        return logEntry
    }

    public getStream(level: number) {
        return this.errorLevels[level] ? process.stderr : process.stdout
    }

    public handleExceptions() {
        process.on('uncaughtException', (error) => {
            this[this.forceExitOnException ? 'forceExit' : 'exit'](isObject(error) && error['exitCode'] ? error['exitCode'] : 1, this.fatalLevel, error)
        })
    }

    public handleRejections() {
        process.on('unhandledRejection', (reason) => {
            throw new UnhandledRejectionError('Unhandled rejection:', { cause: reason })
        })
    }

    protected applyTransformer(transformer: LogTransformer, entry: LogEntry) {
        try {
            const transformed = transformer(entry, this)

            if (!transformed) {
                return
            }

            entry = transformed
        } catch (error) {
            throw new TransformError({ logger: this, transformer, entry }, 'Transform error:', { cause: error })
        }

        return entry
    }

    protected writeToTransport(transport: Transport, entry: LogEntry) {
        entry.message = entry.message ? stripAnsi(entry.message) : entry.message

        try {
            transport.write(entry, this)
        } catch (error) {
            this.log(this.fatalLevel, new TransportError({ logger: this, transport, entry }, 'Transport error:', { cause: error }), {
                [LOG_INPUT]: true,
                exclude: { transports: [transport] },
            })
        }
    }

    protected write(entry: LogEntry) {
        this.getStream(entry.level).write(this.prettier.entry(entry) + EOL)
    }

    protected toLogEntry(level: number, message?: any, ...context: any[]) {
        const entry: LogEntry = { instance: this, timestamp: new Date(), level, context: [], errors: [], metadata: {} }

        if (notUndefined(message)) {
            if (isObject(message) && isKeyOf(message, LOG_LAZY_MESSAGE)) {
                message = message[LOG_LAZY_MESSAGE]()
            }

            if (isString(message)) {
                entry.message = message
            } else {
                context.unshift(message)
            }
        }

        return this.resolveEntryContext(entry, context)
    }

    protected resolveEntryContext(entry: LogEntry, context: any[]) {
        for (const item of context) {
            if (item instanceof Error) {
                entry.errors.push(item)
            } else if (isObject(item)) {
                if (isKeyOf(item, LOG_LAZY_CONTEXT)) {
                    entry.context.push(...item[LOG_LAZY_CONTEXT]())
                } else if (isKeyOf(item, LOG_INPUT)) {
                    entry = mergeEntry(entry, item)
                } else {
                    entry.context.push(item)
                }
            } else {
                entry.context.push(item)
            }
        }

        return entry
    }
}
