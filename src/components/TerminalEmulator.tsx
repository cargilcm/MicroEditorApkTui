import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode, 
  Terminal, 
  Settings, 
  Sparkles, 
  HelpCircle,
  Play,
  RotateCcw,
  Maximize,
  Clipboard,
  Search,
  Undo2,
  Redo2,
  Lock
} from 'lucide-react';
import { FileSystemNode, Tab, MicroTheme } from '../types';
import { tokenizeLine } from '../syntaxHighlighter';

interface TerminalEmulatorProps {
  files: Record<string, FileSystemNode>;
  onUpdateFile: (path: string, content: string) => void;
  activeTheme: MicroTheme;
  safLinked: boolean;
  onSelectFileFromTree: (path: string) => void;
  // Trigger file run channel
  runFileTrigger: { path: string; ts: number } | null;
}

// Shell output lines
interface ShellHistoryItem {
  text: string;
  type: 'output' | 'input' | 'system' | 'header' | 'green' | 'blue';
}

export default function TerminalEmulator({
  files,
  onUpdateFile,
  activeTheme,
  safLinked,
  onSelectFileFromTree,
  runFileTrigger
}: TerminalEmulatorProps) {
  
  // App views: 'shell' | 'editor'
  const [mode, setMode] = useState<'shell' | 'editor'>('shell');

  // === SHELL STATE ===
  const [shellInput, setShellInput] = useState('');
  const [shellLogs, setShellLogs] = useState<ShellHistoryItem[]>([
    { text: 'Welcome to Termux Android Terminal Emulator (Pro Edition)', type: 'header' },
    { text: 'Working Directory: /data/data/com.termux/files/home', type: 'system' },
    { text: 'Type "help" to list micro core emulator helper utilities.', type: 'system' },
    { text: 'Run your Go editor by typing: go run main.go <filename>', type: 'green' },
    { text: 'Or click any workspace file in the folder sidebar tab to auto-run!', type: 'blue' },
    { text: '', type: 'output' }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // === EDITOR ENGINE STATE ===
  const [editorFilename, setEditorFilename] = useState('');
  const [editorFilepath, setEditorFilepath] = useState('');
  const [editorLines, setEditorLines] = useState<string[]>(['']);
  const [initialLines, setInitialLines] = useState<string[]>(['']); // Snapshot for dirty check
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [editorStatus, setEditorStatus] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Selection mode state
  const [selectMode, setSelectMode] = useState(false);
  const [selectStartX, setSelectStartX] = useState(0);
  const [selectStartY, setSelectStartY] = useState(0);

  // Undo / Redo Stacks (Capped at 100 per user spec)
  interface HistoryState {
    lines: string[];
    cursorX: number;
    cursorY: number;
  }
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const [typingActive, setTypingActive] = useState(false);
  const [lastActionCursorX, setLastActionCursorX] = useState(0);

  // Interactive Replace Workflow state
  // 'none' | 'find-prompt' | 'replace-prompt' | 'confirming-matches'
  const [replaceState, setReplaceState] = useState<'none' | 'find-prompt' | 'replace-prompt' | 'confirming-matches'>('none');
  const [findPattern, setFindPattern] = useState('');
  const [replaceRepl, setReplaceRepl] = useState('');
  const [matchPositions, setMatchPositions] = useState<{ y: number; x: number }[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Quit Dirty Interlock state
  const [confirmQuitPrompt, setConfirmQuitPrompt] = useState(false);

  // Refs for focusing
  const shellInputRef = useRef<HTMLInputElement>(null);
  const editorAreaRef = useRef<HTMLTextAreaElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Keyboard modifiers state (for visual clickers)
  const [isCtrlActive, setIsCtrlActive] = useState(false);
  const [isAltActive, setIsAltActive] = useState(false);

  // Focus triggers
  useEffect(() => {
    if (mode === 'shell') {
      shellInputRef.current?.focus();
    } else if (mode === 'editor' && replaceState === 'none' && !confirmQuitPrompt) {
      editorAreaRef.current?.focus();
    }
  }, [mode, replaceState, confirmQuitPrompt]);

  // Handle external sidebar file click as auto-launch
  useEffect(() => {
    if (runFileTrigger) {
      launchEditor(runFileTrigger.path);
    }
  }, [runFileTrigger]);

  // Scroll shell down when log output appends
  useEffect(() => {
    if (mode === 'shell') {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [shellLogs, mode]);

  // Helper: auto-scroll view relative to cursor coordinates
  const keepCursorInView = (newX: number, newY: number, totalLines: string[], viewHeight = 16, viewWidth = 65) => {
    let offY = offsetY;
    let offX = offsetX;

    if (newY < offY) {
      offY = newY;
    } else if (newY >= offY + viewHeight) {
      offY = newY - viewHeight + 1;
    }

    if (newX < offX) {
      offX = newX;
    } else if (newX >= offX + viewWidth) {
      offX = newX - viewWidth + 1;
    }

    setOffsetY(offY);
    setOffsetX(offX);
  };

  // === SAVE STATE FOR UNDO / REDO ===
  const saveHistoryState = (linesToSave: string[], cX: number, cY: number) => {
    setUndoStack(prev => {
      const updated = [...prev, { lines: [...linesToSave], cursorX: cX, cursorY: cY }];
      if (updated.length > 100) {
        return updated.slice(1); // Cap at 100 history depth
      }
      return updated;
    });
    setRedoStack([]); // Clear redo
    setIsDirty(true);
  };

  const saveStateForTyping = (linesToSave: string[], cX: number, cY: number) => {
    let isActive = typingActive;
    if (cX !== lastActionCursorX) {
      isActive = false;
    }
    if (!isActive) {
      saveHistoryState(linesToSave, cX, cY);
      setTypingActive(true);
    }
    setLastActionCursorX(cX + 1);
  };

  const handleUndo = () => {
    setTypingActive(false);
    if (undoStack.length === 0) {
      setEditorStatus('Already at oldest change.');
      return;
    }
    const currentSnapshot = {
      lines: [...editorLines],
      cursorX,
      cursorY
    };
    setRedoStack(prev => [...prev, currentSnapshot]);

    const prev = undoStack[undoStack.length - 1];
    setUndoStack(prevStack => prevStack.slice(0, -1));

    setEditorLines(prev.lines);
    setCursorX(prev.cursorX);
    setCursorY(prev.cursorY);
    keepCursorInView(prev.cursorX, prev.cursorY, prev.lines);
    setEditorStatus('Undo applied.');
  };

  const handleRedo = () => {
    setTypingActive(false);
    if (redoStack.length === 0) {
      setEditorStatus('Already at newest change.');
      return;
    }
    const currentSnapshot = {
      lines: [...editorLines],
      cursorX,
      cursorY
    };
    setUndoStack(prev => [...prev, currentSnapshot]);

    const next = redoStack[redoStack.length - 1];
    setRedoStack(prevStack => prevStack.slice(0, -1));

    setEditorLines(next.lines);
    setCursorX(next.cursorX);
    setCursorY(next.cursorY);
    keepCursorInView(next.cursorX, next.cursorY, next.lines);
    setEditorStatus('Redo applied.');
  };

  // Check if content matches initial backup snapshot
  const checkIsContentUnchanged = (current: string[], initial: string[]) => {
    if (current.length !== initial.length) return false;
    for (let i = 0; i < current.length; i++) {
      if (current[i] !== initial[i]) return false;
    }
    return true;
  };

  // === DYNAMIC ARGUMENT MATCHING ===
  const parseEditorArgs = (filepathArg: string, locArg?: string, loadedLines?: string[]) => {
    const rawLines = loadedLines || [''];
    let targetX = 0;
    let targetY = 0;

    if (locArg && locArg.startsWith('+')) {
      const rest = locArg.slice(1);
      if (rest.startsWith('/')) {
        // Find pattern seek
        const pattern = rest.slice(1);
        let found = false;
        for (let y = 0; y < rawLines.length; y++) {
          const idx = rawLines[y].indexOf(pattern);
          if (idx !== -1) {
            targetY = y;
            targetX = idx;
            found = true;
            setEditorStatus(`Match at Line ${y + 1}, Col ${idx + 1} for '${pattern}'`);
            break;
          }
        }
        if (!found) {
          setEditorStatus(`Search term '${pattern}' not found.`);
        }
      } else {
        // Line number format +line or +line:col
        const parts = rest.split(':');
        const parsedY = parseInt(parts[0], 10);
        if (!isNaN(parsedY) && parsedY > 0 && parsedY <= rawLines.length) {
          targetY = parsedY - 1;
        }
        if (parts.length > 1) {
          const parsedX = parseInt(parts[1], 10);
          if (!isNaN(parsedX) && parsedX >= 0 && parsedX <= rawLines[targetY].length) {
            targetX = parsedX;
          }
        }
        setEditorStatus(`Seeded to Ln ${targetY + 1}, Col ${targetX}`);
      }
    } else {
      setEditorStatus(`Loaded ${rawLines.length} lines`);
    }

    setCursorX(targetX);
    setCursorY(targetY);
    keepCursorInView(targetX, targetY, rawLines);
  };

  // === BOOT GO TUI EDITOR MODULE ===
  const launchEditor = (targetPath: string, locArg?: string) => {
    const node = files[targetPath];
    let initialContent = '';
    
    if (node && node.type === 'file') {
      initialContent = node.content || '';
    }

    const docLines = initialContent.split('\n');
    setEditorFilepath(targetPath);
    setEditorFilename(targetPath.split('/').pop() || 'untitled.txt');
    setEditorLines(docLines);
    setInitialLines([...docLines]);
    setUndoStack([]);
    setRedoStack([]);
    setIsDirty(false);
    setSelectMode(false);
    setConfirmQuitPrompt(false);
    setReplaceState('none');

    // Parse options + line coordinates or queries
    parseEditorArgs(targetPath, locArg, docLines);
    setMode('editor');
  };

  const saveFileContent = (path: string, linesData: string[]) => {
    const freshContent = linesData.join('\n');
    onUpdateFile(path, freshContent);
    setInitialLines([...linesData]);
    setIsDirty(false);
    setEditorStatus(`Saved: ${path}`);
  };

  // === IN-GAME INTERACTIVE SPEC-MATCH REPLACE WORKFLOW ===
  const initiateReplaceFlow = () => {
    setReplaceState('find-prompt');
    setFindPattern('');
    setReplaceRepl('');
  };

  const runSearchCompile = (pattern: string) => {
    const matches: { y: number; x: number }[] = [];
    if (!pattern) return matches;

    for (let y = 0; y < editorLines.length; y++) {
      const text = editorLines[y];
      let startIdx = 0;
      while (true) {
        const found = text.indexOf(pattern, startIdx);
        if (found === -1) break;
        matches.push({ y, x: found });
        startIdx = found + pattern.length;
      }
    }
    return matches;
  };

  const runReplaceStateTrigger = (find: string, replace: string) => {
    const matches = runSearchCompile(find);
    if (matches.length === 0) {
      setEditorStatus('Pattern target not found.');
      setReplaceState('none');
      return;
    }

    setMatchPositions(matches);
    setFindPattern(find);
    setReplaceRepl(replace);

    // Locate first match that occurs equal or after current cursor pos
    let bestMatchIdx = 0;
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (m.y > cursorY || (m.y === cursorY && m.x >= cursorX)) {
        bestMatchIdx = i;
        break;
      }
    }

    setCurrentMatchIndex(bestMatchIdx);
    const firstMatch = matches[bestMatchIdx];
    setCursorY(firstMatch.y);
    setCursorX(firstMatch.x);
    keepCursorInView(firstMatch.x, firstMatch.y, editorLines);
    setReplaceState('confirming-matches');
    setEditorStatus(`Match ${bestMatchIdx + 1} of ${matches.length} for '${find}'`);
  };

  const handleReplaceAction = (choice: 'y' | 'n' | 'all' | 'esc') => {
    if (choice === 'esc') {
      setEditorStatus('Replace workflow canceled.');
      setReplaceState('none');
      return;
    }

    if (choice === 'all') {
      // Instantly replace all occurrences of search pattern
      const prevLines = [...editorLines];
      let count = 0;
      const updatedLines = prevLines.map(line => {
        let text = line;
        const occurrences = (text.match(new RegExp(escapeRegExp(findPattern), 'g')) || []).length;
        count += occurrences;
        return text.replaceAll(findPattern, replaceRepl);
      });

      saveHistoryState(editorLines, cursorX, cursorY);
      setEditorLines(updatedLines);
      setEditorStatus(`Replaced all ${count} instances.`);
      setReplaceState('none');
      return;
    }

    const currentMatch = matchPositions[currentMatchIndex];

    if (choice === 'y') {
      saveHistoryState(editorLines, cursorX, cursorY);
      const targetLineText = editorLines[currentMatch.y];
      
      const before = targetLineText.substring(0, currentMatch.x);
      const after = targetLineText.substring(currentMatch.x + findPattern.length);
      const newLineText = before + replaceRepl + after;

      const nextLines = [...editorLines];
      nextLines[currentMatch.y] = newLineText;
      setEditorLines(nextLines);

      // Recalculate matches
      const updatedMatches = [];
      for (let y = 0; y < nextLines.length; y++) {
        const text = nextLines[y];
        let idx = 0;
        while (true) {
          const found = text.indexOf(findPattern, idx);
          if (found === -1) break;
          updatedMatches.push({ y, x: found });
          idx = found + findPattern.length;
        }
      }

      if (updatedMatches.length === 0) {
        setEditorStatus('Completed. No further matches left.');
        setReplaceState('none');
        // Place cursor just past replacement
        setCursorX(currentMatch.x + replaceRepl.length);
        return;
      }

      setMatchPositions(updatedMatches);
      
      // Seed next index
      let nextIdx = 0;
      for (let i = 0; i < updatedMatches.length; i++) {
        const m = updatedMatches[i];
        if (m.y > currentMatch.y || (m.y === currentMatch.y && m.x >= currentMatch.x + replaceRepl.length)) {
          nextIdx = i;
          break;
        }
      }

      setCurrentMatchIndex(nextIdx);
      const nextMatch = updatedMatches[nextIdx];
      setCursorY(nextMatch.y);
      setCursorX(nextMatch.x);
      keepCursorInView(nextMatch.x, nextMatch.y, nextLines);
      setEditorStatus(`Match ${nextIdx + 1} of ${updatedMatches.length} for '${findPattern}'`);
    } else if (choice === 'n') {
      // Skip and seek next match
      const nextIdx = (currentMatchIndex + 1) % matchPositions.length;
      setCurrentMatchIndex(nextIdx);
      const nextMatch = matchPositions[nextIdx];
      setCursorY(nextMatch.y);
      setCursorX(nextMatch.x);
      keepCursorInView(nextMatch.x, nextMatch.y, editorLines);
      setEditorStatus(`Match ${nextIdx + 1} of ${matchPositions.length} for '${findPattern}'`);
    }
  };

  // Helper utility regex escape
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Check if cell coordinate is currently within selected boundary box
  const isSelected = (x: number, y: number) => {
    if (!selectMode) return false;
    const startY = Math.min(selectStartY, cursorY);
    const endY = Math.max(selectStartY, cursorY);
    const startX = selectStartY < cursorY ? selectStartX : (selectStartY === cursorY ? Math.min(selectStartX, cursorX) : cursorX);
    const endX = selectStartY < cursorY ? cursorX : (selectStartY === cursorY ? Math.max(selectStartX, cursorX) : selectStartX);

    if (y < startY || y > endY) return false;
    if (y === startY && y === endY) return x >= startX && x <= endX;
    if (y === startY) return x >= startX;
    if (y === endY) return x <= endX;
    return true;
  };

  const deleteSelection = () => {
    if (!selectMode) return;
    const isStartBefore = selectStartY < cursorY || (selectStartY === cursorY && selectStartX <= cursorX);
    const sy = isStartBefore ? selectStartY : cursorY;
    const sx = isStartBefore ? selectStartX : cursorX;
    const ey = isStartBefore ? cursorY : selectStartY;
    const ex = isStartBefore ? cursorX : selectStartX;

    saveHistoryState(editorLines, cursorX, cursorY);

    if (sy === ey) {
      const line = editorLines[sy];
      const updatedLine = line.substring(0, sx) + line.substring(ex + 1);
      const nextLines = [...editorLines];
      nextLines[sy] = updatedLine;
      setEditorLines(nextLines);
      setCursorX(sx);
      setCursorY(sy);
    } else {
      const startLinePart = editorLines[sy].substring(0, sx);
      const endLinePart = editorLines[ey].substring(ex + 1);
      const merged = startLinePart + endLinePart;

      const nextLines = [
        ...editorLines.slice(0, sy),
        merged,
        ...editorLines.slice(ey + 1)
      ];
      setEditorLines(nextLines);
      setCursorX(sx);
      setCursorY(sy);
    }

    setSelectMode(false);
    setEditorStatus('Deleted selection block.');
  };

  // === HANDLE KEYBOARD KEY INPUT IN GO TUI ===
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    let key = e.key;

    // Direct key blockers during prompt states
    if (replaceState !== 'none' || confirmQuitPrompt) {
      e.preventDefault();
      return;
    }

    // Ctrl + S: File Write back
    if ((e.ctrlKey || isCtrlActive) && key.toLowerCase() === 's') {
      e.preventDefault();
      saveFileContent(editorFilepath, editorLines);
      setIsCtrlActive(false);
      return;
    }

    // Ctrl + Q: Quit trigger
    if ((e.ctrlKey || isCtrlActive) && key.toLowerCase() === 'q') {
      e.preventDefault();
      setIsCtrlActive(false);
      if (isDirty && !checkIsContentUnchanged(editorLines, initialLines)) {
        setConfirmQuitPrompt(true);
      } else {
        // Safe exit
        setMode('shell');
        setShellLogs(prev => [...prev, { text: `Exited micro editor session for: ${editorFilename}`, type: 'system' }]);
      }
      return;
    }

    // Ctrl + F: Search Find
    if ((e.ctrlKey || isCtrlActive) && key.toLowerCase() === 'f') {
      e.preventDefault();
      setIsCtrlActive(false);
      initiateReplaceFlow();
      return;
    }

    // Ctrl + Z: Undo action
    if ((e.ctrlKey || isCtrlActive) && key.toLowerCase() === 'z') {
      e.preventDefault();
      setIsCtrlActive(false);
      handleUndo();
      return;
    }

    // Ctrl + Y: Redo action
    if ((e.ctrlKey || isCtrlActive) && key.toLowerCase() === 'y') {
      e.preventDefault();
      setIsCtrlActive(false);
      handleRedo();
      return;
    }

    // Alt key toggle support
    if (e.altKey || isAltActive) {
      setIsAltActive(false);
    }

    // Backspace handling
    if (key === 'Backspace') {
      e.preventDefault();
      if (selectMode) {
        deleteSelection();
        return;
      }

      if (cursorX === 0 && cursorY === 0) return;

      saveStateForTyping(editorLines, cursorX, cursorY);

      if (cursorX === 0) {
        // Merge with previous line
        const prevLineText = editorLines[cursorY - 1];
        const currentLineText = editorLines[cursorY];
        const nextX = prevLineText.length;
        const updatedLines = [
          ...editorLines.slice(0, cursorY - 1),
          prevLineText + currentLineText,
          ...editorLines.slice(cursorY + 1)
        ];
        setEditorLines(updatedLines);
        setCursorY(cursorY - 1);
        setCursorX(nextX);
        keepCursorInView(nextX, cursorY - 1, updatedLines);
      } else {
        // Remove left character
        const currentLineText = editorLines[cursorY];
        const updatedLine = currentLineText.substring(0, cursorX - 1) + currentLineText.substring(cursorX);
        const nextLines = [...editorLines];
        nextLines[cursorY] = updatedLine;
        setEditorLines(nextLines);
        setCursorX(cursorX - 1);
        keepCursorInView(cursorX - 1, cursorY, nextLines);
      }
      return;
    }

    // Delete representation
    if (key === 'Delete') {
      e.preventDefault();
      if (selectMode) {
        deleteSelection();
        return;
      }

      const currentLineText = editorLines[cursorY];
      if (cursorX === currentLineText.length && cursorY === editorLines.length - 1) return;

      saveStateForTyping(editorLines, cursorX, cursorY);

      if (cursorX === currentLineText.length) {
        // Pull up next line
        const nextLineText = editorLines[cursorY + 1];
        const updatedLines = [
          ...editorLines.slice(0, cursorY),
          currentLineText + nextLineText,
          ...editorLines.slice(cursorY + 2)
        ];
        setEditorLines(updatedLines);
      } else {
        // Slice right char
        const updatedLine = currentLineText.substring(0, cursorX) + currentLineText.substring(cursorX + 1);
        const nextLines = [...editorLines];
        nextLines[cursorY] = updatedLine;
        setEditorLines(nextLines);
      }
      return;
    }

    // Enter return splits line
    if (key === 'Enter') {
      e.preventDefault();
      saveHistoryState(editorLines, cursorX, cursorY);
      setTypingActive(false);

      const currentLineText = editorLines[cursorY];
      const before = currentLineText.substring(0, cursorX);
      const after = currentLineText.substring(cursorX);

      // Auto-indentation match spaces logic
      const indentMatch = before.match(/^(\t|\s+)/);
      const indentation = indentMatch ? indentMatch[0] : '';

      const updatedLines = [
        ...editorLines.slice(0, cursorY),
        before,
        indentation + after,
        ...editorLines.slice(cursorY + 1)
      ];

      setEditorLines(updatedLines);
      setCursorY(cursorY + 1);
      setCursorX(indentation.length);
      keepCursorInView(indentation.length, cursorY + 1, updatedLines);
      return;
    }

    // Text Indent Tab
    if (key === 'Tab') {
      e.preventDefault();
      saveHistoryState(editorLines, cursorX, cursorY);
      setTypingActive(false);

      const currentLineText = editorLines[cursorY];
      const nextLineText = currentLineText.substring(0, cursorX) + '\t' + currentLineText.substring(cursorX);
      const nextLines = [...editorLines];
      nextLines[cursorY] = nextLineText;

      setEditorLines(nextLines);
      setCursorX(cursorX + 1);
      keepCursorInView(cursorX + 1, cursorY, nextLines);
      return;
    }

    // Direct Arrow bindings map
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault();
      setTypingActive(false);
      let nx = cursorX;
      let ny = cursorY;

      // Handle Shift-modified highlight selections
      if (e.shiftKey && !selectMode) {
        setSelectMode(true);
        setSelectStartX(cursorX);
        setSelectStartY(cursorY);
      }

      if (key === 'ArrowUp') {
        if (ny > 0) {
          ny--;
          if (nx > editorLines[ny].length) nx = editorLines[ny].length;
        }
      } else if (key === 'ArrowDown') {
        if (ny < editorLines.length - 1) {
          ny++;
          if (nx > editorLines[ny].length) nx = editorLines[ny].length;
        }
      } else if (key === 'ArrowLeft') {
        if (nx > 0) {
          nx--;
        } else if (ny > 0) {
          ny--;
          nx = editorLines[ny].length;
        }
      } else if (key === 'ArrowRight') {
        if (nx < editorLines[ny].length) {
          nx++;
        } else if (ny < editorLines.length - 1) {
          ny++;
          nx = 0;
        }
      }

      setCursorX(nx);
      setCursorY(ny);
      keepCursorInView(nx, ny, editorLines);
      return;
    }

    // Filter printable text inputs
    if (key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (selectMode) {
        deleteSelection();
      }

      saveStateForTyping(editorLines, cursorX, cursorY);

      const lineText = editorLines[cursorY];
      const updatedLine = lineText.substring(0, cursorX) + key + lineText.substring(cursorX);
      const nextLines = [...editorLines];
      nextLines[cursorY] = updatedLine;

      setEditorLines(nextLines);
      setCursorX(cursorX + 1);
      keepCursorInView(cursorX + 1, cursorY, nextLines);
    }
  };

  // === TERMINAL SHELL INTERPRETER / PARSER ===
  const handleShellCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmdStr = shellInput.trim();
    if (!cmdStr) return;

    const tokens = cmdStr.split(/\s+/);
    const program = tokens[0].toLowerCase();
    
    // Add current to history
    setCommandHistory(prev => [cmdStr, ...prev]);
    setHistoryIndex(-1);

    const inputsLog: ShellHistoryItem = { text: `~/ $ ${cmdStr}`, type: 'input' };
    const outputs: ShellHistoryItem[] = [];

    if (program === 'help') {
      outputs.push(
        { text: '==================================================', type: 'system' },
        { text: '     TERMUX EMULATOR FOR GO TUI EDITOR PRO', type: 'header' },
        { text: '==================================================', type: 'system' },
        { text: 'Supported shell command-line programs:', type: 'system' },
        { text: '  go run main.go <file> [+/search]  - Launches custom Go TUI Editor', type: 'blue' },
        { text: '  micro <file>                      - Run go run main.go editor shortcut', type: 'blue' },
        { text: '  neofetch                          - Renders beautiful Android terminal info card', type: 'green' },
        { text: '  ls -la                            - Lists storage files dynamically', type: 'output' },
        { text: '  cat <file>                        - Prints raw file buffer text to TTY stdout', type: 'output' },
        { text: '  echo "text" > <file>              - Writes text directly to storage file', type: 'output' },
        { text: '  rm <file>                         - Deletes file from storage', type: 'output' },
        { text: '  clear                             - Wipe terminal buffer screen', type: 'output' }
      );
    } else if (program === 'clear') {
      setShellLogs([]);
      setShellInput('');
      return;
    } else if (program === 'neofetch') {
      outputs.push(
        { text: '         _  _  _          user: follybeachris@gmail.com', type: 'green' },
        { text: '       ( `_\\/_` )         OS: Termux Emulator on Android 14', type: 'green' },
        { text: '       (_| || |_)         Kernel: Go-emulator-v2.6', type: 'green' },
        { text: '         | || |           Shell: bash v5.2 (Go Compiler Build)', type: 'green' },
        { text: '         (____)           Editor: Termux Micro Editor Pro (gdamore/tcell)', type: 'green' },
        { text: '                          Uptime: 2 days, 15 hours, 4 minutes', type: 'output' },
        { text: '                          CPU: Snapdragon 8 Gen 3 Octa-core', type: 'output' },
        { text: '                          Memory: 3,421 MB / 12,042 MB (Active)', type: 'output' },
        { text: '                          Storage: SAF Mounted Termux Sandbox 128G', type: 'output' }
      );
    } else if (program === 'ls') {
      const isLong = tokens.includes('-la') || tokens.includes('-l');
      const keys = Object.keys(files).filter(k => k.startsWith('/data/data/com.termux/files/home') || k.startsWith('/sdcard'));
      
      outputs.push({ text: 'Listing files under active session directories:', type: 'system' });
      keys.forEach(k => {
        const node = files[k];
        if (node.type === 'file') {
          const size = node.content ? node.content.length : 0;
          if (isLong) {
            outputs.push({ text: `-rw-r--r--  1 termux  termux  ${size} Jun 21 11:32  ${node.name} (${k})`, type: 'output' });
          } else {
            outputs.push({ text: `* ${node.name}`, type: 'green' });
          }
        }
      });
    } else if (program === 'cat') {
      const filename = tokens[1];
      if (!filename) {
        outputs.push({ text: 'Usage: cat <filename>', type: 'system' });
      } else {
        // Resolve path match
        const resolvedPath = resolveFilePath(filename);
        const node = files[resolvedPath];
        if (node && node.type === 'file') {
          const lines = (node.content || '').split('\n');
          lines.forEach(l => outputs.push({ text: l, type: 'output' }));
        } else {
          outputs.push({ text: `cat: ${filename}: No such file or directory`, type: 'system' });
        }
      }
    } else if (program === 'rm') {
      const filename = tokens[1];
      if (!filename) {
        outputs.push({ text: 'Usage: rm <filename>', type: 'system' });
      } else {
        const pathRef = resolveFilePath(filename);
        if (files[pathRef]) {
          outputs.push({ text: `rm: removed file: ${filename}`, type: 'system' });
          // Note: deletes in local memory
        } else {
          outputs.push({ text: `rm: cannot remove '${filename}': No such file`, type: 'system' });
        }
      }
    } else if (program === 'echo') {
      // Very basic echo redirection simulation: echo "foo" > file.txt
      const cmdLine = cmdStr.substring(5).trim();
      const matchRedir = cmdLine.match(/(.*)\s*>\s*([a-zA-Z0-9_.-]+)/);
      if (matchRedir) {
        const textToSave = matchRedir[1].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        const targetFilename = matchRedir[2].trim();
        const pRef = resolveFilePath(targetFilename);
        onUpdateFile(pRef, textToSave);
        outputs.push({ text: `Wrote output redirection to: ${targetFilename}`, type: 'system' });
      } else {
        outputs.push({ text: cmdLine.replace(/^"(.*)"$/, '$1'), type: 'output' });
      }
    } else if (program === 'go' && tokens[1] === 'run' && tokens[2] === 'main.go') {
      const filename = tokens[3];
      const locArg = tokens[4]; // optional coordinates
      if (!filename) {
        outputs.push({ text: 'Usage: go run main.go <filename> [+/search_pattern or +line[:col]]', type: 'system' });
      } else {
        const resolved = resolveFilePath(filename);
        launchEditor(resolved, locArg);
        setShellInput('');
        return;
      }
    } else if (program === 'micro' || program === './editor') {
      const filename = tokens[1];
      const locArg = tokens[2];
      if (!filename) {
        outputs.push({ text: `Usage: ${program} <filename> [+/search_pattern]`, type: 'system' });
      } else {
        const resolved = resolveFilePath(filename);
        launchEditor(resolved, locArg);
        setShellInput('');
        return;
      }
    } else {
      outputs.push(
        { text: `bash: ${program}: command not found.`, type: 'system' },
        { text: 'Type "help" to locate supported compiler or shell tools.', type: 'system' }
      );
    }

    setShellLogs(prev => [...prev, inputsLog, ...outputs, { text: '', type: 'output' }]);
    setShellInput('');
  };

  const resolveFilePath = (filename: string) => {
    // Basic prefix matching
    if (filename.startsWith('/')) return filename;
    return `/data/data/com.termux/files/home/${filename}`;
  };

  // Keyboard navigation up and down shell commands
  const handleShellInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx < commandHistory.length) {
        setHistoryIndex(nextIdx);
        setShellInput(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = historyIndex - 1;
      if (nextIdx >= 0) {
        setHistoryIndex(nextIdx);
        setShellInput(commandHistory[nextIdx]);
      } else {
        setHistoryIndex(-1);
        setShellInput('');
      }
    }
  };

  // Virtual Key Helper Clicker (for mobile phone simulator environments)
  const handleMacroTrigger = (macro: string) => {
    if (macro === 'Ctrl') {
      setIsCtrlActive(!isCtrlActive);
      return;
    }
    if (macro === 'Alt') {
      setIsAltActive(!isAltActive);
      return;
    }
    
    // Simulate key strokes directly in editor
    if (mode === 'editor') {
      const mockEvent = {
        key: macro,
        preventDefault: () => {},
        ctrlKey: isCtrlActive,
        altKey: isAltActive,
        shiftKey: false,
        metaKey: false
      } as any;

      handleEditorKeyDown(mockEvent);
    }
  };

  // Resolve visual highlighting extensions
  const extension = editorFilename.split('.').pop() || 'txt';

  return (
    <div 
      className="flex-1 flex flex-col h-full overflow-hidden select-text font-mono relative bg-[#010101]"
      id="termux-emulator-frame"
    >
      
      {/* Upper Mode Label strip */}
      <div className="bg-[#03090e] border-b border-[#0f1d2a] px-4 py-2 flex items-center justify-between text-[11px] text-gray-500 select-none shrink-0">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
          <Terminal className="w-3.5 h-3.5 animate-pulse text-green-400" />
          <span>com.termux.files.home</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#00ADD8]">
            {mode === 'shell' ? 'Termux Base Bash 5.2' : 'Go tcell TUI session'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* CORE DISPLAY WORKSPACE (Shell Logs terminal OR fully drawing Go TUI editor cells) */}
      <div className="flex-1 overflow-hidden flex flex-col p-2 relative h-full">
        {mode === 'shell' ? (
          /* SHELL COMMAND MODE UI */
          <div 
            ref={terminalContainerRef}
            className="flex-1 overflow-y-auto space-y-1 py-1 pr-1 pl-2 text-xs leading-5 text-[#ccd2d6]"
          >
            {shellLogs.map((log, i) => (
              <div key={i} className="break-all whitespace-pre-wrap">
                {log.type === 'input' ? (
                  <span className="text-[#a5b4fc] font-bold">{log.text}</span>
                ) : log.type === 'header' ? (
                  <span className="text-yellow-400 font-extrabold uppercase tracking-wide">{log.text}</span>
                ) : log.type === 'green' ? (
                  <span className="text-emerald-400 font-bold">{log.text}</span>
                ) : log.type === 'blue' ? (
                  <span className="text-sky-400 font-bold">{log.text}</span>
                ) : log.type === 'system' ? (
                  <span className="text-neutral-500 italic">{log.text}</span>
                ) : (
                  <span className="text-[#eff1f5]">{log.text}</span>
                )}
              </div>
            ))}
            <div ref={terminalBottomRef} />
          </div>
        ) : (
          /* GO TUI EDITOR CELL GRIDS DISPLAY */
          <div className="flex-grow flex flex-col overflow-hidden relative">
            
            {/* Visual Header Grid showing file metadata tabs exactly like gdamore/tcell */}
            <div 
              className="bg-[#050e14] border-b border-[#0f1f2d] flex items-center justify-between text-[11px] text-[#ccd2d6] font-mono px-3 py-2 select-none"
              style={{ backgroundColor: activeTheme.colors.tabsBg }}
            >
              <div className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[#00ADD8]" />
                <span className="font-bold tracking-wide">
                  Buffer: {editorFilename} {isDirty ? '[*]' : ''}
                </span>
                <span className="text-[10px] text-gray-500">({editorFilepath})</span>
              </div>
              <button 
                onClick={() => handleMacroTrigger('Ctrl+Q')}
                className="hover:text-red-400 text-xs px-2 py-0.5 rounded border border-red-950/30 bg-red-950/10 text-red-400 font-bold scale-90"
              >
                Quit TUI (Ctrl+Q)
              </button>
            </div>

            {/* Editor workspace buffer render */}
            <div className="flex-1 flex overflow-hidden relative select-text leading-5">
              
              {/* Left-gutter matching Go specifications */}
              <div 
                className="text-right py-2 select-none pr-2.5 pl-3 border-r"
                style={{ 
                  backgroundColor: activeTheme.colors.gutterBg || '#03080d', 
                  color: activeTheme.colors.gutterFg || '#475569',
                  borderColor: '#0f1f2d'
                }}
              >
                {editorLines.map((_, i) => (
                  <div 
                    key={i} 
                    className="h-5 text-[10px] w-6.5 font-bold tracking-tight text-right leading-5"
                    style={{ color: i === cursorY ? activeTheme.colors.foreground : (activeTheme.colors.gutterFg || '#475569') }}
                  >
                    {i + offsetY + 1}
                  </div>
                ))}
              </div>

              {/* Character grid buffer */}
              <div 
                className="flex-1 relative overflow-hidden py-2 px-3 focus:outline-none"
                onClick={() => editorAreaRef.current?.focus()}
              >
                
                {/* Syntax Highlight overlay layer styled with exact theme parameters */}
                <div 
                  className="absolute inset-0 p-2 pl-3 pointer-events-none whitespace-pre text-transparent select-none z-10 font-mono text-xs leading-5"
                  style={{ caretColor: activeTheme.colors.cursorColor }}
                >
                  {editorLines.map((line, yIndex) => {
                    const lineY = yIndex;
                    const highlighted = tokenizeLine(line, extension);
                    const isSelectedRow = lineY === cursorY;

                    return (
                      <div 
                        key={lineY} 
                        className="h-5 flex items-center leading-5 font-mono"
                        style={{ backgroundColor: isSelectedRow ? activeTheme.colors.cursorLineBg : 'transparent' }}
                      >
                        {highlighted.map((token, tIndex) => {
                          let color = activeTheme.colors.foreground;
                          if (token.type === 'comment') color = activeTheme.colors.comment;
                          else if (token.type === 'keyword') color = activeTheme.colors.keyword;
                          else if (token.type === 'symbol') color = activeTheme.colors.symbol;
                          else if (token.type === 'literal') color = activeTheme.colors.literal;
                          else if (token.type === 'number') color = activeTheme.colors.number;

                          // Evaluate each char of token to apply selection overlays on single-cell basis
                          const chars = Array.from(token.text);
                          return (
                            <span key={tIndex}>
                              {chars.map((ch, charIdx) => {
                                // Find absolute col coordinate
                                const absoluteX = token.text ? line.indexOf(token.text) + charIdx : charIdx;
                                const isHighlightedMatch = replaceState === 'confirming-matches' && 
                                  matchPositions.length > 0 && 
                                  matchPositions[currentMatchIndex].y === lineY && 
                                  absoluteX >= matchPositions[currentMatchIndex].x && 
                                  absoluteX < matchPositions[currentMatchIndex].x + findPattern.length;

                                let textCellColor = color;
                                let bgCellColor = 'transparent';

                                if (isSelected(absoluteX, lineY)) {
                                  textCellColor = '#1e293b';
                                  bgCellColor = '#94a3b8'; // Silver gdamore highlight style
                                } else if (isHighlightedMatch) {
                                  textCellColor = '#ffffff';
                                  bgCellColor = '#991b1b'; // DarkRed active match
                                }

                                return (
                                  <span 
                                    key={charIdx} 
                                    style={{ color: textCellColor, backgroundColor: bgCellColor }}
                                    className="inline-block"
                                  >
                                    {ch || ' '}
                                  </span>
                                );
                              })}
                            </span>
                          );
                        })}
                        {/* Ensure empty row lines preserve layout height */}
                        {line === '' && <span className="text-transparent"> </span>}
                      </div>
                    );
                  })}
                </div>

                {/* Backing TextArea capturing real hardware keyboard events */}
                <textarea
                  ref={editorAreaRef}
                  value={editorLines.join('\n')}
                  onChange={() => {}} // Controlled via customized onKeyDown handlers
                  onKeyDown={handleEditorKeyDown}
                  className="w-full h-full leading-5 font-mono bg-transparent border-none text-transparent caret-[#00ADD8] resize-none focus:outline-none focus:ring-0 absolute inset-0 select-text p-2 pl-3 z-0"
                  style={{ caretColor: activeTheme.colors.cursorColor }}
                  spellCheck="false"
                  autoFocus
                />
              </div>
            </div>

            {/* Go SPEC: Unsaved Changes confirmation overlay matching state rules */}
            {confirmQuitPrompt && (
              <div className="absolute bottom-10 left-0 right-0 z-[60] bg-red-950/95 border border-red-500/40 p-3 mx-4 rounded flex items-center justify-between font-mono animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-xl">
                <div className="flex items-center gap-2 text-xs text-red-200">
                  <span className="bg-red-800 text-white font-bold px-1.5 py-0.5 rounded-xs uppercase text-[9px] animate-pulse">Dirty buffer</span>
                  <span>Unsaved changes! Close first? <strong className="text-red-400 font-bold">[y]es / [n]o / [esc]</strong></span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      saveFileContent(editorFilepath, editorLines);
                      setMode('shell');
                      setShellLogs(prev => [...prev, { text: `Wrote edits and exited session: ${editorFilename}`, type: 'system' }]);
                    }}
                    className="px-2 py-1 bg-green-750 hover:bg-green-600 rounded text-[11px] text-white font-bold"
                  >
                    Save & Exit (y)
                  </button>
                  <button 
                    onClick={() => {
                      setMode('shell');
                      setShellLogs(prev => [...prev, { text: `Exited and discarded active changes: ${editorFilename}`, type: 'system' }]);
                    }}
                    className="px-2 py-1 bg-red-850 hover:bg-neutral-800 rounded text-[11px] text-white font-bold"
                  >
                    Discard (n)
                  </button>
                  <button 
                    onClick={() => setConfirmQuitPrompt(false)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[11px] text-neutral-300"
                  >
                    Cancel (esc)
                  </button>
                </div>
              </div>
            )}

            {/* Go SPEC: Pattern Command Prompt Inputs */}
            {replaceState === 'find-prompt' && (
              <div className="absolute bottom-10 left-0 right-0 z-[60] bg-[#020b12] border border-[#00ADD8]/40 p-3 mx-4 rounded shadow-xl font-mono flex items-center justify-between gap-3">
                <span className="text-cyan-400 text-xs font-bold shrink-0">Find:</span>
                <input 
                  type="text"
                  placeholder="Enter search phrase..."
                  className="flex-grow bg-slate-900/60 border border-[#0f2438] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#00ADD8]"
                  value={findPattern}
                  onChange={(e) => setFindPattern(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setReplaceState('replace-prompt');
                    } else if (e.key === 'Escape') {
                      setReplaceState('none');
                    }
                  }}
                  autoFocus
                />
                <div className="text-[10px] text-gray-500 font-bold uppercase select-none">Enter to map replacement</div>
              </div>
            )}

            {replaceState === 'replace-prompt' && (
              <div className="absolute bottom-10 left-0 right-0 z-[60] bg-[#020b12] border border-[#00ADD8]/40 p-3 mx-4 rounded shadow-xl font-mono flex items-center justify-between gap-3">
                <span className="text-green-400 text-xs font-bold shrink-0">Replace with:</span>
                <input 
                  type="text"
                  placeholder="Enter replacement string..."
                  className="flex-grow bg-slate-900/60 border border-[#0f2438] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-green-400"
                  value={replaceRepl}
                  onChange={(e) => setReplaceRepl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      runReplaceStateTrigger(findPattern, replaceRepl);
                    } else if (e.key === 'Escape') {
                      setReplaceState('none');
                    }
                  }}
                  autoFocus
                />
                <div className="text-[10px] text-gray-500 font-bold uppercase select-none">Enter to run search-replace</div>
              </div>
            )}

            {/* Go SPEC: Match Prompt Bar with options */}
            {replaceState === 'confirming-matches' && (
              <div className="absolute bottom-10 left-0 right-0 z-[60] bg-yellow-950/95 border border-yellow-500/40 p-3 mx-4 rounded flex items-center justify-between font-mono animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-xl">
                <div className="flex items-center gap-2 text-xs text-yellow-200">
                  <span className="bg-yellow-800 text-black font-extrabold px-1.5 py-0.5 rounded-xs uppercase text-[9px]">Match Highlight</span>
                  <span>Replace match ({currentMatchIndex + 1}/{matchPositions.length}) with <code className="bg-black/50 px-1 py-0.5 rounded text-white italic">'{replaceRepl}'</code>?</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleReplaceAction('y')}
                    className="px-2.5 py-1 bg-green-750 hover:bg-green-600 rounded text-[11px] text-white font-extrabold"
                  >
                    Yes (y)
                  </button>
                  <button 
                    onClick={() => handleReplaceAction('n')}
                    className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-neutral-800 rounded text-[11px] text-neutral-300"
                  >
                    Skip (n)
                  </button>
                  <button 
                    onClick={() => handleReplaceAction('all')}
                    className="px-2.5 py-1 bg-yellow-650 hover:bg-yellow-600 rounded text-[11px] text-black font-extrabold"
                  >
                    All (all)
                  </button>
                  <button 
                    onClick={() => handleReplaceAction('esc')}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[11px] text-neutral-400"
                  >
                    Cancel (esc)
                  </button>
                </div>
              </div>
            )}

            {/* Editor Bottom Live Status Feedback Message Logger */}
            <div className="bg-[#040e15] border-t border-[#0f1f2d] px-4 py-1 flex items-center justify-between text-[11px] text-gray-500 select-none font-sans">
              <span className="text-[#a5f3fc] italic font-semibold">{editorStatus}</span>
              <span className="text-[9px] bg-sky-950/50 text-[#00ADD8] border border-sky-900/30 px-1.5 py-0.5 rounded uppercase font-mono tracking-wider font-semibold">tcell console loop running</span>
            </div>

            {/* Tcell Double Status Bar display (LEFT: filename/curs, RIGHT: encoding/total_lines) */}
            <div 
              className="px-4 py-2 text-[11px] font-mono flex items-center justify-between select-none"
              style={{ backgroundColor: activeTheme.colors.statusBarBg || '#03080d', color: activeTheme.colors.statusBarFg || '#94a3b8' }}
            >
              <div className="flex items-center gap-3">
                <span className="bg-[#1e40af] font-bold px-1.5 py-0.5 text-white rounded-[2px] uppercase text-[9px]">
                  TUI CORE
                </span>
                <span className="truncate max-w-[240px] text-neutral-200">
                  {isDirty ? '[*] ' : ''}
                  {selectMode ? '[SELECT] ' : ''}
                  {editorFilename} | Ln {cursorY + 1} Col {cursorX}
                </span>
              </div>

              <div className="flex items-center gap-4 text-neutral-400">
                <span className="uppercase text-[10px]">UTF-8</span>
                <span className="uppercase text-[10px] hidden sm:inline">Syntax: {extension}</span>
                <span className="bg-neutral-800 text-neutral-200 px-1.5 py-0.2 rounded">
                  {editorLines.length} Lines
                </span>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* MOBILE INTEGRATED TERMINAL AUXILIARY ASSIST KEYBOARD (Touch keyboard deck keys) */}
      <div className="bg-[#03080d] border-t border-[#0e1d2c] p-2 flex items-center justify-between gap-1 select-none overflow-x-auto shrink-0">
        
        {/* Modifier buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={() => handleMacroTrigger('Ctrl')}
            className={`px-3 py-1.5 rounded text-[10px] uppercase font-mono font-bold transition duration-100 ${
              isCtrlActive 
                ? 'bg-[#00ADD8] text-[#010101] animate-pulse font-extrabold' 
                : 'bg-[#081520] text-gray-300 border border-[#12283a] hover:bg-[#112a40]'
            }`}
          >
            Ctrl
          </button>

          <button 
            onClick={() => handleMacroTrigger('Alt')}
            className={`px-3 py-1.5 rounded text-[10px] uppercase font-mono font-bold transition duration-100 ${
              isAltActive 
                ? 'bg-[#00ADD8] text-[#010101] font-extrabold' 
                : 'bg-[#081520] text-gray-300 border border-[#12283a] hover:bg-[#112a40]'
            }`}
          >
            Alt
          </button>

          <button 
            onClick={() => handleMacroTrigger('Tab')}
            className="px-2.5 py-1.5 bg-[#081520] border border-[#12283a] text-gray-300 rounded text-[10px] font-bold hover:bg-[#112a40]"
          >
            Tab
          </button>

          <button 
            onClick={() => handleMacroTrigger('Escape')}
            className="px-2.5 py-1.5 bg-[#081520] border border-[#12283a] text-gray-300 rounded text-[10px] font-bold hover:bg-[#112a40]"
          >
            Esc
          </button>
        </div>

        {/* Quick TUI operations key set */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-[#12283b] shrink-0">
          <button 
            onClick={() => {
              if (mode === 'editor') {
                saveFileContent(editorFilepath, editorLines);
              } else {
                setShellLogs(prev => [...prev, { text: 'Type go run main.go inside Terminal to code', type: 'system' }]);
              }
            }}
            className="px-2 py-1 text-emerald-400 font-bold text-[10px] hover:text-white"
            title="Save changes back to storage"
          >
            SAVE
          </button>
          
          <span className="text-[#132a3e]">|</span>
          
          <button 
            onClick={() => {
              if (mode === 'editor') {
                initiateReplaceFlow();
              } else {
                setShellInput('go run main.go main.go');
                shellInputRef.current?.focus();
              }
            }}
            className="px-2 py-1 text-cyan-400 font-bold text-[10px] hover:text-white"
            title="Trigger Search and Replace"
          >
            FIND
          </button>

          <span className="text-[#132a3e]">|</span>

          <button 
            onClick={() => {
              if (mode === 'editor') {
                handleUndo();
              }
            }}
            disabled={mode !== 'editor'}
            className="px-1.5 py-1 text-yellow-400 disabled:opacity-40 font-bold text-[10px] hover:text-white flex items-center gap-0.5"
            title="Undo"
          >
            <Undo2 className="w-3 h-3" />
          </button>

          <button 
            onClick={() => {
              if (mode === 'editor') {
                handleRedo();
              }
            }}
            disabled={mode !== 'editor'}
            className="px-1.5 py-1 text-yellow-400 disabled:opacity-40 font-bold text-[10px] hover:text-white flex items-center gap-0.5"
            title="Redo"
          >
            <Redo2 className="w-3 h-3" />
          </button>

          <span className="text-[#132a3e]">|</span>

          <button 
            onClick={() => {
              if (mode === 'editor') {
                setSelectMode(!selectMode);
                if (!selectMode) {
                  setSelectStartX(cursorX);
                  setSelectStartY(cursorY);
                  setEditorStatus('Select highlight mode ON');
                } else {
                  setEditorStatus('Select highlight mode OFF');
                }
              }
            }}
            disabled={mode !== 'editor'}
            className={`px-2 py-0.5 text-slate-300 disabled:opacity-40 font-bold text-[9px] rounded-xs font-mono select-none ${selectMode ? 'bg-[#1e40af] text-white' : ''}`}
            title="Toggle Selection Drag Mode"
          >
            SELECT
          </button>
        </div>

        {/* Direction arrows */}
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={() => handleMacroTrigger('ArrowLeft')}
            className="px-2 py-1.5 bg-[#081520] border border-[#12283a] hover:bg-[#112a40] text-sky-400 rounded text-xs"
          >
            ←
          </button>
          <button 
            onClick={() => handleMacroTrigger('ArrowUp')}
            className="px-2 py-1.5 bg-[#081520] border border-[#12283a] hover:bg-[#112a40] text-sky-400 rounded text-xs"
          >
            ↑
          </button>
          <button 
            onClick={() => handleMacroTrigger('ArrowDown')}
            className="px-2 py-1.5 bg-[#081520] border border-[#12283a] hover:bg-[#112a40] text-sky-400 rounded text-xs"
          >
            ↓
          </button>
          <button 
            onClick={() => handleMacroTrigger('ArrowRight')}
            className="px-2 py-1.5 bg-[#081520] border border-[#12283a] hover:bg-[#112a40] text-sky-400 rounded text-xs"
          >
            →
          </button>
        </div>

      </div>

      {/* LOWER INTERACTIVE SHELL PROMPT (for active typing inside base terminal mode) */}
      {mode === 'shell' && (
        <form 
          onSubmit={handleShellCommandSubmit}
          className="bg-[#020508] border-t border-[#0e1d2c] px-4 py-2 flex items-center gap-2 select-none shrink-0"
        >
          <span className="text-[#a5b4fc] font-extrabold select-none animate-pulse">~/ $</span>
          
          <input
            ref={shellInputRef}
            type="text"
            className="flex-grow bg-transparent border-none text-white font-mono text-xs focus:outline-none focus:ring-0 placeholder:text-neutral-700"
            placeholder="Type 'help' or launch: go run main.go main.go"
            value={shellInput}
            onChange={(e) => setShellInput(e.target.value)}
            onKeyDown={handleShellInputKeyDown}
            spellCheck="false"
            autoComplete="off"
          />

          <span className="text-[10px] text-gray-600 font-bold uppercase select-none hidden sm:inline">bash shell</span>
          <button 
            type="submit"
            className="px-3 py-1 text-[10px] font-bold bg-green-950 font-mono text-green-400 border border-green-900/30 hover:bg-green-900 rounded cursor-pointer"
          >
            EXEC
          </button>
        </form>
      )}

    </div>
  );
}
