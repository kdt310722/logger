import { EOL } from 'node:os'
import { ltrim } from '@kdt310722/utils/string'
import { bgRed, bold, dim, isColorSupported, whiteBright, yellow } from 'colorette'

export function text(message: any) {
    return whiteBright(String(message))
}

export function muted(message: any) {
    return dim(String(message))
}

export function badge(message: any) {
    return isColorSupported ? bgRed(text(` ${message} `)) : `[${message}]`
}

export function highlight(message: any) {
    return bold(yellow(String(message)))
}

export function indent(input: string, size = 2, trim = false) {
    return input.split(EOL).map((i) => ' '.repeat(size) + (trim ? ltrim(i) : i)).join(EOL)
}
