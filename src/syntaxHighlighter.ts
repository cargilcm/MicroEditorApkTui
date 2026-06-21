export interface HighlightedToken {
  text: string;
  type: 'comment' | 'keyword' | 'symbol' | 'literal' | 'number' | 'normal';
}

const GO_KEYWORDS = new Set([
  'package', 'import', 'func', 'type', 'struct', 'interface', 'return', 'var', 'const',
  'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'go', 'select', 'chan',
  'map', 'nil', 'true', 'false', 'err', 'error', 'int', 'string', 'float64', 'bool', 'make', 'append'
]);

const PY_KEYWORDS = new Set([
  'def', 'class', 'import', 'from', 'as', 'return', 'if', 'elif', 'else', 'for', 'while',
  'in', 'is', 'and', 'or', 'not', 'try', 'except', 'finally', 'with', 'print', 'len',
  'True', 'False', 'None', 'self', 'lambda', 'pass', 'break', 'continue'
]);

const CSS_KEYWORDS = new Set([
  'body', 'html', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'a', 'button', 'input', 'img',
  '@import', 'margin', 'padding', 'background', 'color', 'font-family', 'border', 'display',
  'flex', 'grid', 'text-align2', 'center', 'transition', 'width', 'height', 'box-sizing'
]);

const JSON_KEYWORDS = new Set([
  'true', 'false', 'null'
]);

export function tokenizeLine(line: string, extension: string): HighlightedToken[] {
  if (!line) {
    return [{ text: '', type: 'normal' }];
  }

  // Handle entire line comments for standard files
  const trimmed = line.trim();
  if ((extension === 'go' || extension === 'js' || extension === 'ts' || extension === 'css') && trimmed.startsWith('//')) {
    return [{ text: line, type: 'comment' }];
  }
  if ((extension === 'py' || extension === 'conf' || extension === 'micro' || extension === 'sh') && trimmed.startsWith('#')) {
    return [{ text: line, type: 'comment' }];
  }

  // Handle Markdown specially
  if (extension === 'md') {
    if (trimmed.startsWith('#')) {
      return [{ text: line, type: 'keyword' }]; // headings
    }
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
      return [{ text: line, type: 'symbol' }]; // list items
    }
    // Simple bold/italic or links highlighting
    if (line.includes('**') || line.includes('`') || line.includes('[') && line.includes(']')) {
      // Return beautiful mixed elements
      const tokens: HighlightedToken[] = [];
      let i = 0;
      while (i < line.length) {
        if (line.slice(i, i + 2) === '**') {
          tokens.push({ text: '**', type: 'symbol' });
          i += 2;
        } else if (line[i] === '`') {
          tokens.push({ text: '`', type: 'literal' });
          i++;
        } else {
          tokens.push({ text: line[i], type: 'normal' });
          i++;
        }
      }
      return tokens;
    }
    return [{ text: line, type: 'normal' }];
  }

  // Special XML / HTML parsing (Simplified representation)
  if (extension === 'html' || extension === 'xml') {
    const tokens: HighlightedToken[] = [];
    let currentText = '';
    let inTag = false;
    let i = 0;
    while (i < line.length) {
      const char = line[i];
      if (char === '<') {
        if (currentText) {
          tokens.push({ text: currentText, type: 'normal' });
          currentText = '';
        }
        inTag = true;
        tokens.push({ text: '<', type: 'symbol' });
      } else if (char === '>') {
        if (currentText) {
          const isClosing = currentText.startsWith('/');
          const cleanTag = isClosing ? currentText.substring(1).trim() : currentText.trim();
          tokens.push({ text: currentText, type: isClosing || GO_KEYWORDS.has(cleanTag) || PY_KEYWORDS.has(cleanTag) ? 'keyword' : 'literal' });
          currentText = '';
        }
        inTag = false;
        tokens.push({ text: '>', type: 'symbol' });
      } else {
        currentText += char;
      }
      i++;
    }
    if (currentText) {
      tokens.push({ text: currentText, type: inTag ? 'keyword' : 'normal' });
    }
    return tokens;
  }

  // General-purpose tokenizer for micro Go/Python/JSON style highlighting
  const tokens: HighlightedToken[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    const char = line[i];

    // Whitespace handling
    if (/\s/.test(char)) {
      let space = '';
      while (i < len && /\s/.test(line[i])) {
        space += line[i];
        i++;
      }
      tokens.push({ text: space, type: 'normal' });
      continue;
    }

    // Double-slash comments mid-line
    if ((extension === 'go' || extension === 'js' || extension === 'ts') && char === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.substring(i), type: 'comment' });
      break;
    }

    // Hash comments mid-line
    if ((extension === 'py' || extension === 'conf' || extension === 'sh') && char === '#') {
      tokens.push({ text: line.substring(i), type: 'comment' });
      break;
    }

    // String literals
    if (char === '"' || char === "'" || char === '`') {
      const quoteChar = char;
      let literalStr = quoteChar;
      i++;
      let escaped = false;
      while (i < len) {
        const nextChar = line[i];
        literalStr += nextChar;
        if (escaped) {
          escaped = false;
        } else if (nextChar === '\\') {
          escaped = true;
        } else if (nextChar === quoteChar) {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ text: literalStr, type: 'literal' });
      continue;
    }

    // Numbers
    if (/\d/.test(char)) {
      let numStr = '';
      while (i < len && /[0-9.xXaAbBcdfF_]/.test(line[i])) {
        numStr += line[i];
        i++;
      }
      tokens.push({ text: numStr, type: 'number' });
      continue;
    }

    // Identifiers and Key words
    if (/[a-zA-Z_]/.test(char)) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_]/.test(line[i])) {
        word += line[i];
        i++;
      }

      // Check current syntax set
      let isKeyword = false;
      if (extension === 'go' && GO_KEYWORDS.has(word)) isKeyword = true;
      if (extension === 'py' && PY_KEYWORDS.has(word)) isKeyword = true;
      if (extension === 'css' && CSS_KEYWORDS.has(word)) isKeyword = true;
      if (extension === 'json' && JSON_KEYWORDS.has(word)) isKeyword = true;

      // Special check for JSON keys
      if (extension === 'json' && line[i] === ':') {
        tokens.push({ text: word, type: 'literal' }); // Style JSON keys nicely
        continue;
      }

      tokens.push({
        text: word,
        type: isKeyword ? 'keyword' : 'normal'
      });
      continue;
    }

    // Symbols / Operators
    const isSymbol = '=+-*/%&|^!<>:;,.()[]{}'.includes(char);
    tokens.push({
      text: char,
      type: isSymbol ? 'symbol' : 'normal'
    });
    i++;
  }

  return tokens;
}
