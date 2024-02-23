import { muted } from '../utils'

const pad = (n: number, maxLength = 2) => String(n).padStart(maxLength, '0')

export const createPrettyPrintTimestamp = () => (timestamp: Date) => {
    return muted(`[${pad(timestamp.getHours())}:${pad(timestamp.getMinutes())}:${pad(timestamp.getSeconds())}.${pad(timestamp.getMilliseconds(), 3)}]`)
}
