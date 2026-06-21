export interface FileSystemNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  children?: string[]; // list of paths for children
}

export interface Tab {
  id: string;
  fileName: string;
  filePath: string;
  content: string;
  cursorRow: number; // 0-based
  cursorCol: number; // 0-based
  isDirty: boolean;
}

export interface MicroTheme {
  name: string;
  colors: {
    background: string;
    foreground: string;
    comment: string;
    keyword: string;
    symbol: string;
    literal: string; // HTML, quote, tag, custom value
    number: string;
    gutterBg: string;
    gutterFg: string;
    statusBarBg: string;
    statusBarFg: string;
    cursorColor: string;
    cursorLineBg: string;
    selectionBg: string;
    commandBg: string;
    commandFg: string;
    tabsBg: string;
    tabsFg: string;
    tabActiveBg: string;
    tabActiveFg: string;
  };
}

export interface TerminalLog {
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'input';
}
