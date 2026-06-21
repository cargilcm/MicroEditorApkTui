import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Settings, 
  HelpCircle, 
  Cpu, 
  Database, 
  FileText, 
  Plus, 
  FolderPlus, 
  Key, 
  ExternalLink,
  Github,
  Sun,
  Moon,
  Info
} from 'lucide-react';
import { FileSystemNode, Tab, TerminalLog, MicroTheme } from './types';
import { INITIAL_FILES } from './initialFileSystem';
import { MICRO_THEMES } from './themes';
import StorageNavigator from './components/StorageNavigator';
import TerminalEmulator from './components/TerminalEmulator';
import AndroidFrame from './components/AndroidFrame';
import DevHowtoGuide from './components/DevHowtoGuide';

const LOCAL_STORAGE_FILES_KEY = 'termux_micro_files_tree';
const LOCAL_STORAGE_THEME_KEY = 'termux_micro_active_theme';

export default function App() {
  // Load and preserve files tree
  const [files, setFiles] = useState<Record<string, FileSystemNode>>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_FILES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_FILES;
      }
    }
    return INITIAL_FILES;
  });

  // Load and preserve active colorscheme theme
  const [activeThemeName, setActiveThemeName] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || 'sophisticated-dark';
  });

  // State managers
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [runFileTrigger, setRunFileTrigger] = useState<{ path: string; ts: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [safLinked, setSafLinked] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  
  // Show standard SAF Permission Modal dialog
  const [showSafModal, setShowSafModal] = useState(false);
  const [isSafLoading, setIsSafLoading] = useState(false);

  // App layouts: 'editor' | 'guide'
  const [activeSidebarTab, setActiveSidebarTab] = useState<'storage' | 'guide'>('storage');

  // Interactive logs simulation
  const [logs, setLogs] = useState<TerminalLog[]>([
    { timestamp: new Date().toLocaleTimeString(), text: 'Termux engine core booted.', type: 'info' },
    { timestamp: new Date().toLocaleTimeString(), text: 'Checking direct folder directories...', type: 'info' },
    { timestamp: new Date().toLocaleTimeString(), text: 'Ready. Open workspace files to start editing!', type: 'success' }
  ]);

  // Persist files state to local cache
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify(files));
  }, [files]);

  // Persist active theme selection
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, activeThemeName);
  }, [activeThemeName]);

  // Spawn initial tabs on load so the screen has active files
  useEffect(() => {
    const defaultGoPath = '/data/data/com.termux/files/home/main.go';
    const defaultReadmePath = '/data/data/com.termux/files/home/README.md';

    const spawnInitialTabs = [];
    if (files[defaultGoPath]) {
      spawnInitialTabs.push({
        id: defaultGoPath,
        fileName: 'main.go',
        filePath: defaultGoPath,
        content: files[defaultGoPath].content || '',
        cursorRow: 0,
        cursorCol: 0,
        isDirty: false
      });
    }

    if (files[defaultReadmePath]) {
      spawnInitialTabs.push({
        id: defaultReadmePath,
        fileName: 'README.md',
        filePath: defaultReadmePath,
        content: files[defaultReadmePath].content || '',
        cursorRow: 0,
        cursorCol: 0,
        isDirty: false
      });
    }

    if (spawnInitialTabs.length > 0) {
      setTabs(spawnInitialTabs);
      setActiveTabId(spawnInitialTabs[0].id); // focus main.go
    }
  }, []);

  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' | 'input' = 'info') => {
    setLogs(prev => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), text, type }
    ]);
  };

  // Open file into active editor window tab
  const handleSelectFile = (path: string) => {
    const node = files[path];
    if (!node || node.type !== 'file') return;

    setActiveTabId(path);
    setRunFileTrigger({ path, ts: Date.now() });
    addLog(`Launching compiler shortcut: go run main.go ${node.name}`, 'input');
  };

  const handleUpdateFile = (path: string, content: string) => {
    setFiles(prev => ({
      ...prev,
      [path]: {
        ...prev[path],
        content: content
      }
    }));
    addLog(`Written back modifications to direct storage URI: ${path}`, 'success');
  };

  // Close tab frame
  const handleCloseTab = (id: string) => {
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    
    addLog(`Closed tab buffer: ${id.split('/').pop()}`, 'info');

    if (activeTabId === id && remaining.length > 0) {
      setActiveTabId(remaining[remaining.length - 1].id);
    } else if (remaining.length === 0) {
      setActiveTabId('');
    }
  };

  // Manage tab focus
  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
  };

  // Capture buffer content changes
  const handleContentChange = (id: string, content: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, content, isDirty: true } : t));
  };

  // Save current active tab back to persistent database
  const handleSaveActiveTab = () => {
    const tabToSave = tabs.find(t => t.id === activeTabId);
    if (!tabToSave) return;

    // Commit state
    setFiles(prev => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        content: tabToSave.content
      }
    }));

    // Reset dirty flag
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isDirty: false } : t));
    addLog(`[Saved] Wrote buffer metadata back to disk uri: ${tabToSave.filePath}`, 'success');
  };

  // Execute storage links with Android System SAF Dialogues
  const triggerSAFAuthFlow = () => {
    setShowSafModal(true);
  };

  const confirmSAFAuthFlow = () => {
    setIsSafLoading(true);
    addLog('Requesting system authorization URI from Android DocumentProvider...', 'info');

    setTimeout(() => {
      setIsSafLoading(false);
      setShowSafModal(false);
      setSafLinked(true);
      addLog('SAF authorization link successful for content://com.termux.documents', 'success');

      // Populate '/saf-termux-mount' directory representing connected files
      const safMountedRoot = '/saf-termux-mount';
      const file1 = `${safMountedRoot}/ProductionGo.go`;
      const file2 = `${safMountedRoot}/DockerTask.yaml`;
      const file3 = `${safMountedRoot}/env_termux.sh`;

      setFiles(prev => {
        const updated = { ...prev };
        
        // Update root children lists
        updated[safMountedRoot] = {
          name: 'SAF Termux Link (Active)',
          path: safMountedRoot,
          type: 'directory',
          children: [file1, file2, file3]
        };

        updated[file1] = {
          name: 'ProductionGo.go',
          path: file1,
          type: 'file',
          content: `package main

import "fmt"

func main() {
\tfmt.Println("This file is running directly on SAF mounted Termux storage!")
}
`
        };

        updated[file2] = {
          name: 'DockerTask.yaml',
          path: file2,
          type: 'file',
          content: `version: "3.9"
services:
  termux-node:
    image: node:18-alpine
    container_name: termux_app_node
    volumes:
      - /data/data/com.termux/files/home:/app
    ports:
      - "8080:8080"
    restart: unless-stopped
`
        };

        updated[file3] = {
          name: 'env_termux.sh',
          path: file3,
          type: 'file',
          content: `#!/bin/bash
echo "Setting up path pointers in android root shell..."
export PATH=$PATH:/data/data/com.termux/files/usr/bin
export EDITOR=micro
echo "Prefix bound. Micro is set as default editor!"
`
        };

        return updated;
      });

      addLog('Successfully populated SAF workspace directory with live link mappings.', 'info');
    }, 1400);
  };

  // Add a new file inside parent path
  const handleAddFile = (parentPath: string, name: string) => {
    const customFilePath = `${parentPath}/${name}`;
    
    if (files[customFilePath]) {
      addLog(`File conflict: path "${customFilePath}" already exists!`, 'error');
      return;
    }

    setFiles(prev => {
      const updated = { ...prev };
      
      // Update parent path's children list
      const parentNode = updated[parentPath];
      if (parentNode) {
        updated[parentPath] = {
          ...parentNode,
          children: [...(parentNode.children || []), customFilePath]
        };
      }

      // Add actual file node
      updated[customFilePath] = {
        name,
        path: customFilePath,
        type: 'file',
        content: `// Created file: ${name}\n`
      };

      return updated;
    });

    addLog(`Created file node at: ${customFilePath}`, 'success');
    handleSelectFile(customFilePath); // immediately open in editor
  };

  // Delete file from workspace
  const handleDeleteFile = (path: string) => {
    const parentParts = path.split('/');
    parentParts.pop();
    const parentPath = parentParts.join('/') || '/';

    setFiles(prev => {
      const updated = { ...prev };
      
      // Remove from parent children list
      const parentNode = updated[parentPath];
      if (parentNode && parentNode.children) {
        updated[parentPath] = {
          ...parentNode,
          children: parentNode.children.filter(c => c !== path)
        };
      }

      // Remove actual node
      delete updated[path];
      return updated;
    });

    // Close any active tab pointing here
    setTabs(prev => prev.filter(t => t.id !== path));
    if (activeTabId === path) {
      setActiveTabId('');
    }

    addLog(`Deleted file node: ${path}`, 'warn');
  };

  // Handle mock physical upload of a computer file directly into simulated device folder
  const handleFileUpload = (parentPath: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string || '';
      handleAddFile(parentPath, file.name);
      setFiles(prev => ({
        ...prev,
        [`${parentPath}/${file.name}`]: {
          name: file.name,
          path: `${parentPath}/${file.name}`,
          type: 'file',
          content: text
        }
      }));
      addLog(`Successfully uploaded and parsed local file: ${file.name}`, 'success');
    };
    reader.readAsText(file);
  };

  // Set theme from custom command strings
  const handleSetTheme = (themeName: string) => {
    if (MICRO_THEMES[themeName]) {
      setActiveThemeName(themeName);
    } else {
      // Find case-insensitive theme key
      const foundKey = Object.keys(MICRO_THEMES).find(
        key => key.toLowerCase() === themeName.toLowerCase() || MICRO_THEMES[key].name === themeName
      );
      if (foundKey) {
        setActiveThemeName(foundKey);
      } else {
        addLog(`Theme "${themeName}" unrecognized. Default-dark or monokai deployed.`, 'warn');
      }
    }
  };

  // Set custom forced highlighter override syntax
  const handleSetSyntax = (syntax: string) => {
    const tabToUpdate = tabs.find(t => t.id === activeTabId);
    if (!tabToUpdate) return;

    // Simulate by appending standard filename extension mapping
    const extensionParts = tabToUpdate.filePath.split('.');
    extensionParts[extensionParts.length - 1] = syntax;
    const mockedPath = extensionParts.join('.');

    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, filePath: mockedPath } : t));
  };

  const getActiveThemeData = (): MicroTheme => {
    return MICRO_THEMES[activeThemeName] || MICRO_THEMES['default-dark'];
  };

  const activeThemeObj = getActiveThemeData();

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col font-mono text-white p-0 m-0">
      
      {/* Device wrapper mockup */}
      <AndroidFrame
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        safLinked={safLinked}
        numTabs={tabs.length}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Main Side Bar Navigation (Storage Selector & Setup Guides) */}
          <div className="w-64 border-r border-[#222] bg-[#0d0d0d] flex flex-col h-full shrink-0 select-none">
            
            {/* Sidebar headers swap panel */}
            <div className="flex border-b border-[#222] bg-[#0c0c0c]">
              <button
                onClick={() => setActiveSidebarTab('storage')}
                id="sidebar-tab-storage"
                className={`flex-1 py-3 text-[11px] font-bold font-mono tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeSidebarTab === 'storage' 
                    ? 'border-b-2 border-[#00ADD8] text-[#00ADD8] bg-[#162125]' 
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" /> Workspace
              </button>

              <button
                onClick={() => setActiveSidebarTab('guide')}
                id="sidebar-tab-guide"
                className={`flex-1 py-3 text-[11px] font-bold font-mono tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeSidebarTab === 'guide' 
                    ? 'border-b-2 border-[#00ADD8] text-[#00ADD8] bg-[#162125]' 
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" /> Setup Guide
              </button>
            </div>

            {/* Sidebar Active components */}
            <div className="flex-1 overflow-hidden">
              {activeSidebarTab === 'storage' ? (
                <StorageNavigator
                  files={files}
                  currentPath={activeTabId}
                  onSelectFile={handleSelectFile}
                  onLinkSAF={triggerSAFAuthFlow}
                  safLinked={safLinked}
                  onAddFile={handleAddFile}
                  onDeleteFile={handleDeleteFile}
                  onFileUpload={handleFileUpload}
                />
              ) : (
                <DevHowtoGuide />
              )}
            </div>
          </div>

          {/* Editor and Logs Grid split layout */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950">
            {/* Main Interactive Terminal & compiled Go Editor */}
            <div className="flex-grow flex flex-col overflow-hidden animate-in fade-in duration-200">
              <TerminalEmulator
                files={files}
                onUpdateFile={handleUpdateFile}
                activeTheme={activeThemeObj}
                safLinked={safLinked}
                onSelectFileFromTree={handleSelectFile}
                runFileTrigger={runFileTrigger}
              />
            </div>

            {/* Bottom half: Collapsible System Terminal Logs feed */}
            <div className="h-40 border-t border-neutral-900 bg-neutral-950 flex flex-col font-mono text-[10px] shrink-0 select-text">
              <div className="bg-neutral-950 border-b border-neutral-900 px-4 py-1.5 flex items-center justify-between text-neutral-500 select-none">
                <span className="font-bold flex items-center gap-1 uppercase tracking-wider text-[9px]">
                  <Terminal className="text-green-500 w-3 h-3 animate-pulse" /> Android Emulator Live Logs
                </span>
                <span className="text-[8px] bg-neutral-900 px-1 py-0.5 rounded text-neutral-400 uppercase font-mono">
                  stdout/stderr daemon
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-neutral-600 shrink-0 font-light select-none">
                      [{log.timestamp}]
                    </span>
                    <span className={`break-all ${
                      log.type === 'success' ? 'text-green-400 font-medium' :
                      log.type === 'warn' ? 'text-amber-400' :
                      log.type === 'error' ? 'text-rose-400 font-bold' :
                      log.type === 'input' ? 'text-cyan-400 font-bold' : 'text-neutral-300'
                    }`}>
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AndroidFrame>

      {/* Floating Storage Access Framework Authorization Dialogue Modal (Android Layout Simulation) */}
      {showSafModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans select-none backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Top android header style banner */}
            <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex items-center gap-3">
              <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/25">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Android SAF System Authorization</h3>
                <span className="text-[9px] text-neutral-400 block font-mono">DocumentProvider Link Request</span>
              </div>
            </div>

            {/* Modal Context */}
            <div className="p-5 space-y-4 text-xs text-neutral-300">
              <p className="leading-relaxed text-[11px] text-neutral-400">
                Granting authorization allows <strong className="text-white font-mono">Micro Editor Pro</strong> to safely Mount, Read, and Write files located inside the Termux isolated storage sandbox.
              </p>

              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono text-[10px] space-y-1 text-blue-400 break-all">
                <div>URI: content://com.termux.documents/tree/home</div>
                <div className="text-neutral-500">Node: /data/data/com.termux/files/home</div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 text-amber-400" />
                <span>By mounting, SAF maps this tree directory to our sandbox instantly with live read/write triggers.</span>
              </div>
            </div>

            {/* Bottom Actions buttons */}
            <div className="p-4 bg-neutral-950/80 border-t border-neutral-800/80 flex items-center justify-between gap-3">
              <button
                disabled={isSafLoading}
                onClick={() => setShowSafModal(false)}
                id="modal-cancel-btn"
                className="w-1/2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[11px] py-2 px-3 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Refuse
              </button>
              
              <button
                disabled={isSafLoading}
                onClick={confirmSAFAuthFlow}
                id="modal-confirm-btn"
                className="w-1/2 bg-blue-650 hover:bg-blue-500 text-white font-mono text-[11px] py-2 px-3 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20 disabled:opacity-50"
              >
                {isSafLoading ? (
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                ) : 'Grant Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
