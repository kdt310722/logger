import { unique } from '@kdt310722/utils/array'
import { tap } from '@kdt310722/utils/function'
import type { BaseLogger } from '../base-logger'
import type { LogEntry, LogTransformer } from '../types'

export interface TransportOptions {
    enabled?: boolean
    level?: number
    transformers?: LogTransformer[]
}

export abstract class Transport {
    protected isEnabled: boolean
    protected level: number
    protected transformers: LogTransformer[]

    public constructor(options: TransportOptions = {}) {
        const { enabled = true, level = Number.NEGATIVE_INFINITY, transformers = [] } = options

        this.isEnabled = enabled
        this.level = level
        this.transformers = transformers
    }

    public enable() {
        return tap(this, () => (this.isEnabled = true))
    }

    public disable() {
        return tap(this, () => (this.isEnabled = false))
    }

    public setLevel(level: number) {
        return tap(this, () => (this.level = level))
    }

    public addTransformer(transformer: LogTransformer) {
        return tap(this, () => (this.transformers = unique([...this.transformers, transformer])))
    }

    public removeTransformer(transformer: LogTransformer) {
        return tap(this, () => (this.transformers = this.transformers.filter((t) => t !== transformer)))
    }

    public write(entry: LogEntry, logger: BaseLogger<any>) {
        if (!this.isEnabled || entry.level < this.level) {
            return
        }

        const transformed = logger.transformEntry(this.transformers, entry)

        if (transformed) {
            this.log(transformed, logger)
        }
    }

    protected abstract log(entry: LogEntry, logger: BaseLogger<any>): void
}
