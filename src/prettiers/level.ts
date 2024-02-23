import { map } from '@kdt310722/utils/object'
import { bold } from 'colorette'

export interface PrettyPrintLevelOptions {
    levels?: Record<string, number>
    colors?: Record<number, (text: string) => string>
}

export function createPrettyPrintLevel(options: PrettyPrintLevelOptions) {
    const { colors } = options
    const levels = map(options.levels ?? {}, (k, v) => [v, k])
    const longestLevelLength = Object.values(levels).reduce((max, level) => Math.max(max, level.length), 0)
    const fmt = (level: number) => colors?.[level] ?? ((text) => text)

    return (level: number) => bold(fmt(level)(String(levels[level] ?? level).toUpperCase().padEnd(longestLevelLength)))
}
