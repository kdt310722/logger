export function escapeMarkdownV2(text: string) {
    return text.replaceAll(/[_*[\]()~`>#+\-=|{}.!]/g, String.raw`\$&`)
}
