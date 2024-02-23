export class UnhandledRejectionError extends Error {
    public constructor(public readonly promise: Promise<any>, message?: string, options?: ErrorOptions) {
        super(message ?? 'Unhandled rejection', options)
    }
}
