import { EOL } from 'node:os'
import { notNullish } from '@kdt310722/utils/common'
import { map } from '@kdt310722/utils/object'
import type { LogEntry } from '../types'
import { muted, text } from '../utils'
import { type PrettyPrintContextOptions, createPrettyPrintContext } from './context'
import { type PrettyPrintErrorOptions, createPrettyPrintError } from './error'
import { createPrettyPrintLevel } from './level'
import { type PrettyPrintTimerOptions, createPrettyPrintTimer } from './timer'
import { createPrettyPrintTimestamp } from './timestamp'

export interface PrettierOptions {
    showName?: boolean
    levels?: Record<string, number>
    colors?: Record<string, (text: string) => string>
    indent?: number
    context?: Omit<PrettyPrintContextOptions, 'indent'>
    error?: Omit<PrettyPrintErrorOptions, 'indent' | 'formatContext'>
    timer?: PrettyPrintTimerOptions
}

export class Prettier {
    protected readonly showName: boolean
    protected readonly levelNames: Record<number, string>
    protected readonly context: (...context: any[]) => string
    protected readonly error: (error: Error, badge?: boolean) => string
    protected readonly level: (level: number) => string
    protected readonly timer: (took: bigint) => string
    protected readonly timestamp: (timestamp: Date) => string

    public constructor(options: PrettierOptions = {}) {
        const { showName = false, levels, colors, indent, context, error, timer } = options

        this.showName = showName
        this.levelNames = levels ? map(levels, (name, level) => [level, name]) : {}
        this.context = createPrettyPrintContext(context)
        this.error = createPrettyPrintError({ ...error, indent, formatContext: this.context })
        this.level = createPrettyPrintLevel({ levels, colors })
        this.timer = createPrettyPrintTimer(timer)
        this.timestamp = createPrettyPrintTimestamp()
    }

    public getLevelName(level: number) {
        return this.levelNames[level] ?? String(level)
    }

    public entry(entry: LogEntry) {
        let message = `${this.timestamp(entry.timestamp)} ${text(entry.icon ?? ' ')} ${this.level(entry.level)}`
        let hasMessage = false
        let hasTimer = false

        if (this.showName && notNullish(entry.instance?.name)) {
            message += muted(` [${entry.instance.name}]`)
        }

        if (notNullish(entry.message)) {
            message += text(` ${entry.message}`)
            hasMessage = true
        }

        if (notNullish(entry.metadata.timer)) {
            message += `  ${this.timer(entry.metadata.timer)}`
            hasTimer = true
        }

        for (const [i, error] of entry.errors.entries()) {
            let badge: boolean | undefined

            if (i === 0 && entry.errors.length === 1 && !hasMessage && !hasTimer) {
                message += ' '
                badge = false
            } else {
                message += EOL
            }

            message += this.error(error, badge)
        }

        if (entry.context.length > 0) {
            message += `${EOL}${this.context(...entry.context)}`
        }

        return message
    }
}
