import { LOG_INPUT, LOG_LAZY_CONTEXT, LOG_LAZY_MESSAGE } from '../constants'
import type { LogEntry } from '../types'

export function message(fn: () => any) {
    return { [LOG_LAZY_MESSAGE]: fn }
}

export function context(fn: () => any[]) {
    return { [LOG_LAZY_CONTEXT]: fn }
}

export function entry(input: Partial<LogEntry>) {
    return { [LOG_INPUT]: true, ...input }
}
