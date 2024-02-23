import { tap } from '@kdt310722/utils/function'
import { isKeyOf, isObject } from '@kdt310722/utils/object'
import { green } from 'colorette'
import type { Logger } from '../logger'
import { entry } from './context'
import { LogUpdate, type LogUpdateOptions } from './log-update'

export interface LoadingOptions extends LogUpdateOptions {
    frames?: string[]
    updateInterval?: number
    clearOnStop?: boolean
}

export const LOG_LOADING_LAZY_START_MESSAGE = Symbol('logger.loading.lazy-start-message')

export function loadingStartMessage(message: () => any) {
    return { [LOG_LOADING_LAZY_START_MESSAGE]: message }
}

export class Loading extends LogUpdate {
    protected readonly frames: string[]
    protected readonly updateInterval: number
    protected readonly clearOnStop: boolean

    protected intervalId?: NodeJS.Timeout
    protected timerId?: string
    protected isStarted = false

    protected startMessage?: any
    protected startContext?: any[]

    public constructor(logger: Logger, options: LoadingOptions = {}) {
        super(logger, options)

        const { frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'], updateInterval = 80, clearOnStop = false } = options

        this.frames = frames
        this.updateInterval = updateInterval
        this.clearOnStop = clearOnStop
    }

    public isLazyStartMessage(message: any) {
        return isObject(message) && isKeyOf(message, LOG_LOADING_LAZY_START_MESSAGE)
    }

    public start(message?: any, ...context: any[]) {
        let index = 0

        const render = () => {
            const msg = this.isLazyStartMessage(message) ? message[LOG_LOADING_LAZY_START_MESSAGE]() : message
            const frame = this.frames[index = ++index % this.frames.length]
            const text = this.getMessage(this.startMessage = msg, ...(this.startContext = context), entry({ icon: frame }))

            this.updater(text)
        }

        this.timerId = this.logger.createTimer()
        this.intervalId = setInterval(render, this.updateInterval)
        this.isStarted = true

        return this.stop.bind(this)
    }

    public stop(message?: any, ...context: any[]) {
        if (!this.isStarted) {
            return
        }

        this.isStarted = false

        const took = tap(this.timerId ? this.logger.stopTimer(this.timerId) : undefined, () => clearInterval(this.intervalId))
        const msg = message ?? this.startMessage
        const ctx = context.length > 0 ? context : (this.startContext ?? [])

        this.updater(this.getMessage(msg, ...ctx, entry({ icon: green('✔'), metadata: { timer: took } })))

        if (this.clearOnStop) {
            this.updater.clear()
        }

        this.updater.done()
    }
}
