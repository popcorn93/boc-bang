const ALLOWED_TAGS = new Set(['P', 'BR', 'B', 'STRONG', 'EM', 'I', 'UL', 'OL', 'LI']);

const appendSafeChildren = (source: Node, target: Node, doc: Document) => {
  source.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.textContent || ''));
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = child as HTMLElement;
    if (!ALLOWED_TAGS.has(element.tagName)) {
      appendSafeChildren(element, target, doc);
      return;
    }

    const safeElement = doc.createElement(element.tagName.toLowerCase());
    appendSafeChildren(element, safeElement, doc);
    target.appendChild(safeElement);
  });
};

export const sanitizeStructuredHtml = (html: string): string => {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');
  const container = document.createElement('div');
  appendSafeChildren(parsed.body, container, document);

  return container.innerHTML;
};

export const htmlToPlainText = (html: string): string => {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]*>/g, '').trim();
  }

  const sanitized = sanitizeStructuredHtml(html);
  const parser = new DOMParser();
  const parsed = parser.parseFromString(sanitized, 'text/html');

  parsed.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  parsed.querySelectorAll('p, li').forEach((block) => {
    block.appendChild(parsed.createTextNode('\n\n'));
  });

  return (parsed.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};
