/** Copies text to the clipboard. Resolves to false when every method is blocked. */
export async function copyText(text: string): Promise<boolean> {
  // The Clipboard API exists only in secure contexts (HTTPS and localhost).
  if (window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or unsupported: fall through to the textarea method.
    }
  }
  return copyWithTextarea(text);
}

function copyWithTextarea(text: string): boolean {
  // Selecting the textarea moves focus; put it back so keyboard users keep their place.
  const previousFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  // iOS Safari ignores select() on a read-only field.
  textarea.setSelectionRange(0, text.length);
  try {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the only copy method left when the Clipboard API is unavailable or blocked.
    return document.execCommand('copy');
  } finally {
    textarea.remove();
    previousFocus?.focus();
  }
}
