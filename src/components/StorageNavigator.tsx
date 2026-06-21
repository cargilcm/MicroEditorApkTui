import React, { useState } from 'react';
import { 
  Folder, 
  File, 
  Database, 
  HardDrive, 
  ShieldAlert, 
  Link, 
  CheckCircle, 
  FolderLock, 
  Plus, 
  Trash2, 
  Upload, 
  FileCode2 
} from 'lucide-react';
import { FileSystemNode } from '../types';

interface StorageNavigatorProps {
  files: Record<string, FileSystemNode>;
  currentPath: string;
  onSelectFile: (path: string) => void;
  onLinkSAF: () => void;
  safLinked: boolean;
  onAddFile: (parentPath: string, name: string) => void;
  onDeleteFile: (path: string) => void;
  onFileUpload: (parentPath: string, file: File) => void;
}

export default function StorageNavigator({
  files,
  currentPath,
  onSelectFile,
  onLinkSAF,
  safLinked,
  onAddFile,
  onDeleteFile,
  onFileUpload
}: StorageNavigatorProps) {
  const [activeSection, setActiveSection] = useState<'termux' | 'sdcard' | 'saf'>('termux');
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Helper to extract node structure
  const getSubNodes = (dirPath: string): FileSystemNode[] => {
    const node = files[dirPath];
    if (!node || !node.children) return [];
    return node.children
      .map(childPath => files[childPath])
      .filter((n): n is FileSystemNode => !!n);
  };

  const termuxHomeNode = files['/data/data/com.termux/files/home'];
  const sdcardNode = files['/sdcard'];
  const safNode = files['/saf-termux-mount'];

  // Handle addition of a new file inside current storage section
  const handleCreateFile = (parentPath: string) => {
    if (!newFileName.trim()) return;
    
    // Ensure accurate file extension
    let cleanName = newFileName.trim();
    onAddFile(parentPath, cleanName);
    setNewFileName('');
    setIsCreating(false);
  };

  const handleLocalUpload = (parentPath: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
      onFileUpload(parentPath, e.target.files[0]);
    }
  };

  const renderFolderItems = (parentPath: string, depth = 0) => {
    const node = files[parentPath];
    if (!node) return null;

    const children = getSubNodes(parentPath);

    return (
      <div key={parentPath} className="space-y-1">
        {children.map((child) => {
          const isSelected = currentPath === child.path;
          const isDir = child.type === 'directory';

          return (
            <div key={child.path} className="group">
              <div 
                className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition text-xs ${
                  isSelected 
                    ? 'bg-[#162125] text-[#00ADD8] font-semibold border-l-2 border-[#00ADD8] rounded-l-none' 
                    : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                }` }
                style={{ paddingLeft: `${(depth + 1) * 12}px` }}
                onClick={() => {
                  if (child.type === 'file') {
                    onSelectFile(child.path);
                  }
                }}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isDir ? (
                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <File className={`w-4 h-4 shrink-0 ${
                      child.name.endsWith('.go') ? 'text-cyan-400' :
                      child.name.endsWith('.py') ? 'text-yellow-400' :
                      child.name.endsWith('.html') ? 'text-orange-400' :
                      child.name.endsWith('.md') ? 'text-violet-400' : 'text-neutral-400'
                    }`} />
                  )}
                  <span className="truncate">{child.name}</span>
                </div>

                {/* Delete button (except root/mount paths) */}
                {!['/data/data/com.termux/files/home', '/sdcard', '/saf-termux-mount'].includes(child.path) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(child.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition"
                    title="Delete File"
                    id={`delete-btn-${child.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isDir && child.children && child.children.length > 0 && (
                <div className="mt-0.5">
                  {renderFolderItems(child.path, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getParentPathForActiveSection = () => {
    if (activeSection === 'termux') return '/data/data/com.termux/files/home';
    if (activeSection === 'sdcard') return '/sdcard';
    return '/saf-termux-mount';
  };

  const targetParentPath = getParentPathForActiveSection();

  return (
    <div id="storage-navigator" className="flex flex-col bg-[#0d0d0d] border-r border-[#1a1a1a] h-full w-full select-none font-sans text-white">
      {/* Upper Storage Picker Tabs */}
      <div className="p-3 border-b border-[#222]">
        <h2 className="text-xs font-mono tracking-widest text-[#00ADD8] uppercase flex items-center gap-1.5 mb-3">
          <Database className="w-3.5 h-3.5 text-[#00ADD8]" /> Storage Mappings
        </h2>
        
        <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-lg border border-[#222]">
          <button
            onClick={() => setActiveSection('termux')}
            id="tab-btn-termux"
            className={`py-1.5 rounded-md text-[10px] font-mono tracking-xs text-center transition cursor-pointer ${
              activeSection === 'termux' 
                ? 'bg-[#161616] text-[#00ADD8] font-bold shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Termux
          </button>
          
          <button
            onClick={() => setActiveSection('sdcard')}
            id="tab-btn-sdcard"
            className={`py-1.5 rounded-md text-[10px] font-mono tracking-xs text-center transition cursor-pointer ${
              activeSection === 'sdcard' 
                ? 'bg-[#161616] text-[#00ADD8] font-bold shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            SD Card
          </button>

          <button
            onClick={() => setActiveSection('saf')}
            id="tab-btn-saf"
            className={`py-1.5 rounded-md text-[10px] font-mono tracking-xs text-center transition cursor-pointer ${
              activeSection === 'saf' 
                ? 'bg-[#161616] text-[#00ADD8] font-bold shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            SAF Link
          </button>
        </div>
      </div>

      {/* Main Storage Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeSection === 'termux' && (
          <div className="space-y-3">
            <div className="bg-black/40 border border-[#222] p-2.5 rounded-lg">
              <span className="text-[10px] font-mono text-gray-500 block break-all">
                $ echo $HOME
              </span>
              <span className="text-[11px] font-mono text-[#00ADD8] block truncate font-bold">
                /data/data/com.termux/files/home
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-mono text-gray-500 uppercase px-1">Files ({termuxHomeNode?.children?.length || 0})</h3>
              {termuxHomeNode && renderFolderItems(termuxHomeNode.path)}
            </div>
          </div>
        )}

        {activeSection === 'sdcard' && (
          <div className="space-y-3">
            <div className="bg-black/40 border border-[#222] p-2.5 rounded-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-mono text-gray-500 block">External Path</span>
                <span className="text-xs font-mono text-white block">/sdcard</span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-[11px] font-mono text-gray-500 uppercase px-1">Internal Storage</h3>
              {sdcardNode && renderFolderItems(sdcardNode.path)}
            </div>
          </div>
        )}

        {activeSection === 'saf' && (
          <div className="space-y-4">
            {!safLinked ? (
              <div className="bg-[#121212] border border-[#222] p-4 rounded-xl text-center space-y-3 shadow-lg">
                <FolderLock className="w-10 h-10 text-gray-500 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold font-mono text-white">SAF Permission Needed</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Access isolated directories on Android through Storage Access Framework document providers.
                  </p>
                </div>
                
                <button
                  onClick={onLinkSAF}
                  id="link-saf-trigger-btn"
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-[#00ADD8] hover:bg-[#00ADD8]/90 text-[#0a0a0a] font-mono text-[11px] py-2 px-3 rounded-lg font-bold transition shadow-md cursor-pointer"
                >
                  <Link className="w-3.5 h-3.5" /> Bind Termux via SAF
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-[#162125] border border-[#00ADD8]/25 p-2.5 rounded-xl flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-[#00ADD8] shrink-0 animate-pulse" />
                  <div className="truncate">
                    <span className="text-[9px] uppercase font-mono text-[#00ADD8] block font-bold">URI GRANTED</span>
                    <span className="text-[10px] font-mono text-gray-300 block truncate">
                      content://com.termux.documents/tree/home
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-[11px] font-mono text-gray-500 uppercase px-1">SAF Mounted Workspace</h3>
                  {safNode && renderFolderItems(safNode.path)}
                </div>
              </div>
            )}

            <div className="bg-black/30 border border-[#222] p-3 rounded-lg space-y-1.5 text-[10px] text-gray-400">
              <span className="font-mono text-white block uppercase font-bold text-[9px] tracking-wide">💡 What is SAF?</span>
              <p className="leading-relaxed">
                The Android Storage Access Framework provides direct, system-recognized document references to sandbox folders without requiring root privileges.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions Form */}
      <div className="p-3 border-t border-[#222] bg-[#0c0c0c] space-y-2">
        {isCreating ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="e.g. script.py, main.go"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              id="new-file-input"
              className="w-full bg-[#161616] border border-[#2e2e2e] rounded-md p-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#00ADD8]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile(targetParentPath);
                if (e.key === 'Escape') setIsCreating(false);
              }}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setIsCreating(false)}
                id="cancel-create-btn"
                className="bg-[#222] hover:bg-[#2c2c2c] text-gray-300 font-mono text-[10px] py-1 px-1.5 rounded-md transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateFile(targetParentPath)}
                id="confirm-create-btn"
                className="bg-[#00ADD8] hover:bg-[#00ADD8]/90 text-[#0a0a0a] font-mono text-[10px] py-1 px-1.5 rounded-md font-bold transition cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setIsCreating(true)}
              id="create-new-file-btn"
              className="flex items-center justify-center gap-1 bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#2d2d2d] font-mono text-[11px] py-1.5 px-2 rounded-lg transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#00ADD8]" /> New File
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              id="upload-file-btn"
              className="flex items-center justify-center gap-1 bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#2d2d2d] font-mono text-[11px] py-1.5 px-2 rounded-lg transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#00ADD8]" /> Upload
            </button>

            <input 
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleLocalUpload(targetParentPath, e)}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}
