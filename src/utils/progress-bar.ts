import { notNullish } from '@kdt310722/utils/common'
import { isNumber } from '@kdt310722/utils/number'
import { isObject, map } from '@kdt310722/utils/object'
import type { Logger } from '../logger'
import { Loading, type LoadingOptions, loadingStartMessage } from './loading'

export interface ProgressBarOptions extends LoadingOptions {
    format?: string
    barSize?: number
    stopOnComplete?: boolean
}

export class ProgressBar {
    public value = 0
    public payload: Record<string, string> = {}

    protected readonly format: string
    protected readonly barSize: number
    protected readonly stopOnComplete: boolean
    protected readonly loading: Loading

    public constructor(logger: Logger, protected readonly total: number, options: ProgressBarOptions = {}) {
        this.format = options.format ?? '{bar} | {percentage}% | {value}/{total}'
        this.barSize = options.barSize ?? 40
        this.stopOnComplete = options.stopOnComplete ?? true
        this.loading = new Loading(logger, options)
    }

    public get isFilled() {
        return this.value >= this.total
    }

    public start(value?: number, payload?: Record<string, string>) {
        if (notNullish(payload)) {
            this.update(payload)
        }

        this.loading.start(loadingStartMessage(() => this.getMessage()))

        if (notNullish(value)) {
            this.update(value)
        }
    }

    public update(value: number | Record<string, string>, payload?: Record<string, string>) {
        if (isNumber(value)) {
            this.value = Math.max(Math.min(value, this.total), 0)
        } else {
            payload = { ...value, ...payload }
        }

        this.payload = { ...this.payload, ...payload }

        if (this.stopOnComplete && this.isFilled) {
            this.stop()
        }
    }

    public increment(delta?: number | Record<string, string>, payload?: Record<string, string>) {
        this.update(this.value + (isNumber(delta) ? delta : 1), isObject(delta) ? { ...delta, ...payload } : payload)
    }

    public stop() {
        this.loading.stop(this.getMessage())
    }

    protected getMessage() {
        const percentage = this.value / this.total * 100

        const payload = {
            '{bar}': () => this.getBar(percentage),
            '{percentage}': () => percentage.toFixed(2),
            '{value}': () => String(this.value),
            '{total}': () => String(this.total),
            ...map(this.payload, (key, val) => [`{${key}}`, () => val]),
        }

        let message = this.format

        for (const [key, value] of Object.entries(payload)) {
            message = message.replace(key, value())
        }

        return message
    }

    protected getBar(percent: number) {
        const bar = Math.floor(this.barSize * percent / 100)
        const left = this.barSize - bar

        return `[${'='.repeat(bar)}${'-'.repeat(left)}]`
    }
}
