import { isBigInt } from '@kdt310722/utils/number'
import { isErrorLike, serializeError } from 'serialize-error'

export const stringify = (value: unknown) => JSON.stringify(value, (_, value) => {
    if (isErrorLike(value)) {
        return serializeError(value)
    }

    if (isBigInt(value)) {
        return `${value}n`
    }

    return value
})
