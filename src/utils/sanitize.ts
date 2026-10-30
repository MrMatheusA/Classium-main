/**
 * Classium Enterprise - Sanitizador de Conteúdo HTML Seguro (Anti-XSS)
 * Protege a renderização de comunicados, relatórios pedagógicos e conteúdos ricos
 * contra injeção de scripts maliciosos, iframes, manipuladores de evento (onload, onerror, onclick) e URLs javascript:.
 */

export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  // Fallback seguro se executado fora do ambiente DOM (SSR / Node)
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirty, 'text/html');

    const DANGEROUS_TAGS = new Set([
      'SCRIPT',
      'IFRAME',
      'OBJECT',
      'EMBED',
      'FORM',
      'INPUT',
      'BUTTON',
      'LINK',
      'META',
      'STYLE',
      'APPLET',
      'BASE',
      'FRAME',
      'FRAMESET'
    ]);

    const sanitizeNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toUpperCase();

        if (DANGEROUS_TAGS.has(tagName)) {
          el.remove();
          return;
        }

        // Remover atributos com eventos ou javascript: / vbscript: / data: maliciosos
        const attributes = Array.from(el.attributes);
        for (const attr of attributes) {
          const name = attr.name.toLowerCase();
          const val = attr.value.trim().toLowerCase();

          // Remover todos os on* (onclick, onerror, onload, onmouseover, etc.)
          if (name.startsWith('on')) {
            el.removeAttribute(attr.name);
            continue;
          }

          // Bloquear URIs executáveis
          if (
            val.startsWith('javascript:') ||
            val.startsWith('vbscript:') ||
            (val.startsWith('data:') && !val.startsWith('data:image/'))
          ) {
            el.removeAttribute(attr.name);
            continue;
          }

          // Se for tag <a>, garantir rel="noopener noreferrer" e target="_blank"
          if (tagName === 'A' && name === 'href') {
            el.setAttribute('rel', 'noopener noreferrer');
            el.setAttribute('target', '_blank');
          }
        }
      }

      // Processar recursivamente filhos
      const children = Array.from(node.childNodes);
      for (const child of children) {
        sanitizeNode(child);
      }
    };

    Array.from(doc.body.childNodes).forEach(sanitizeNode);
    return doc.body.innerHTML;
  } catch (err) {
    console.warn('[sanitizeHtml] Erro ao sanitizar HTML, retornando texto seguro:', err);
    // Em caso de erro do parser, neutraliza caracteres de tags críticas
    return dirty.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
