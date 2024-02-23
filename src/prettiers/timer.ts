import { type FormatOptions, format as formatNumber } from '@kdt310722/utils/number'
import { resolveNestedOptions } from '@kdt310722/utils/object'
import { magenta } from 'colorette'
import prettyMilliseconds, { type Options } from 'pretty-ms'
import { muted } from '../utils'

export interface PrettyPrintTimerOptions {
    humanize?: Options | boolean
    format?: FormatOptions | boolean
}

export function toMilliseconds(input: bigint) {
    const ns = input.toString()
    const intPart = ns.slice(0, -6) || '0'
    const decimalPart = ns.slice(-6).padStart(6, '0')

    return Number(`${intPart}.${decimalPart}`)
}

export function createPrettyPrintTimer(options: PrettyPrintTimerOptions = {}) {
    const humanize = resolveNestedOptions(options.humanize ?? {})
    const format = resolveNestedOptions(options.format ?? {})

    return (took: bigint) => {
        const colorize = (text: string) => muted(magenta(text))

        if (humanize) {
            return colorize(prettyMilliseconds(toMilliseconds(took), { formatSubMilliseconds: true, ...humanize }))
        }

        if (format) {
            return colorize(`${formatNumber(took, format)}ns`)
        }

        return colorize(`${took}ns`)
    }
}
