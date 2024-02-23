import { EOL } from 'node:os'
import { ltrim } from '@kdt310722/utils/string'
import { bgRed, bold, dim, isColorSupported, whiteBright, yellow } from 'colorette'

export function text(message: string) {
    return whiteBright(message)
}

export function muted(message: string) {
    return dim(message)
}

export function badge(message: string) {
    return isColorSupported ? bgRed(text(` ${message} `)) : `[${message}]`
}

export function highlight(message: string) {
    return bold(yellow(message))
}

export function indent(input: string, size = 2, trim = false) {
    return input.split(EOL).map((i) => ' '.repeat(size) + (trim ? ltrim(i) : i)).join(EOL)
}
