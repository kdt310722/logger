import { isNullish, notNullish } from '@kdt310722/utils/common'
import type { LogFilter } from '../types'

export interface DebugOptions {
    level?: number
    filter?: string
}

export function parseDebugFilter(filter: string) {
    const includes: RegExp[] = []
    const excludes: RegExp[] = []

    for (let item of filter.split(/[\s,]+/)) {
        if (!item) {
            continue
        }

        item = item.replaceAll('*', '.*?')

        if (item.startsWith('-')) {
            excludes.push(new RegExp(`^${item.slice(1)}$`))
        } else {
            includes.push(new RegExp(`^${item}$`))
        }
    }

    return { includes, excludes }
}

export function debug(options: DebugOptions = {}): LogFilter {
    const { level: enableLevel, filter = '*' } = options
    const { includes, excludes } = parseDebugFilter(filter)

    return ({ logger, level }) => {
        if (filter === '*' || (notNullish(enableLevel) && level > enableLevel)) {
            return true
        }

        const key = logger.name

        if (filter === '-*' || isNullish(key) || excludes.some((i) => i.test(key))) {
            return false
        }

        return includes.some((i) => i.test(key))
    }
}
