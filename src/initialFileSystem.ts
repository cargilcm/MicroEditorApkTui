import { FileSystemNode } from './types';

export const INITIAL_FILES: Record<string, FileSystemNode> = {
  // ROOT / Root system folders
  '/': {
    name: 'Root',
    path: '/',
    type: 'directory',
    children: [
      '/data/data/com.termux/files/home',
      '/sdcard',
      '/saf-termux-mount'
    ]
  },

  // Termux app private directories
  '/data/data/com.termux/files/home': {
    name: 'home (Termux)',
    path: '/data/data/com.termux/files/home',
    type: 'directory',
    children: [
      '/data/data/com.termux/files/home/main.go',
      '/data/data/com.termux/files/home/hello.py',
      '/data/data/com.termux/files/home/configs',
      '/data/data/com.termux/files/home/README.md'
    ]
  },

  '/data/data/com.termux/files/home/configs': {
    name: 'configs',
    path: '/data/data/com.termux/files/home/configs',
    type: 'directory',
    children: [
      '/data/data/com.termux/files/home/configs/bindings.json',
      '/data/data/com.termux/files/home/configs/custom_theme.micro'
    ]
  },

  '/data/data/com.termux/files/home/main.go': {
    name: 'main.go',
    path: '/data/data/com.termux/files/home/main.go',
    type: 'file',
    content: `package main

import (
\t"fmt"
\t"os"
)

// Config represents micro text editor configurations
type Config struct {
\tTheme     string \`json:"theme"\`
\tTabSize   int    \`json:"tab_size"\`
\tMouseMode bool   \`json:"mouse_mode"\`
}

func main() {
\tfmt.Println("Starting Micro Editor simulation on Android...")
\t
\thomeDir, err := os.UserHomeDir()
\tif err != nil {
\t\tfmt.Fprintf(os.Stderr, "Error: %v\\n", err)
\t\tos.Exit(1)
\t}
\t
\tfmt.Printf("Termux environment home directory: %s\\n", homeDir)
}
`
  },

  '/data/data/com.termux/files/home/hello.py': {
    name: 'hello.py',
    path: '/data/data/com.termux/files/home/hello.py',
    type: 'file',
    content: `def greet_termux_user(username="Developer"):
    """
    Welcoming Android developers using Micro terminal editor
    """
    import os
    print(f"👋 Welcome {username} to the Terminal Micro Core!")
    print("Direct Storage Access Framework (SAF) is simulated successfully.")
    
    # Simulate android standard paths
    termux_prefix = "/data/data/com.termux/files/usr"
    if os.path.exists(termux_prefix):
        print("Detected micro package inside Termux prefix")
        
if __name__ == "__main__":
    greet_termux_user("Termux Fanatic")
`
  },

  '/data/data/com.termux/files/home/configs/bindings.json': {
    name: 'bindings.json',
    path: '/data/data/com.termux/files/home/configs/bindings.json',
    type: 'file',
    content: `{
  "Ctrl-q": "quit",
  "Ctrl-s": "save",
  "Ctrl-f": "find",
  "Ctrl-g": "help",
  "Ctrl-t": "tabcreate",
  "Ctrl-w": "tabclose",
  "Ctrl-e": "command-mode"
}
`
  },

  '/data/data/com.termux/files/home/configs/custom_theme.micro': {
    name: 'custom_theme.micro',
    path: '/data/data/com.termux/files/home/configs/custom_theme.micro',
    type: 'file',
    content: `color-link default "#E0E0E0,#121212"
color-link comment "#757575"
color-link identifier "#64B5F6"
color-link constant "#FFB74D"
color-link keyword "#F48FB1"
color-link type "#A5D6A7"
color-link string "#CE93D8"
color-link number "#FFF59D"
color-link symbol "#80CBC4"
color-link error "bold #EF9A9A"
color-link status-bar "#212121,#E0E0E0"
color-link line-number "#424242,#212121"
`
  },

  '/data/data/com.termux/files/home/README.md': {
    name: 'README.md',
    path: '/data/data/com.termux/files/home/README.md',
    type: 'file',
    content: `# Termux Micro Editor Pro

Welcome to the **Micro Editor Pro** standalone simulator for Android!
This web-based replica features Go's lightweight terminal-based \`micro\` editor.

## Key Micro Commands (Ctrl+E)
Press **Ctrl+E** to focus the command line at the bottom, then type:
- \`set syntax go\` or \`set syntax markdown\` (force language syntax)
- \`set theme bubblegum\` or \`set theme monokai\` (change colorscheme)
- \`help\` (trigger online quick help)
- \`save\` (compiles edits and commits code)
- \`quit\` (close current active frame view)

## Special Touch Action Bar
Since physical keyboards are not always present on Android devices, we provide a **Touch Action Bar** above the keyboard:
- **Ctrl**, **Alt**, **Tab**, **Esc**, and directional arrows.
- Quick buttons to toggle terminal logs, trigger **SAF Folder Selection**, and swap color themes.

## Traversal of Termux Direct Directories
Termux users historically encounter difficulty accessing restricted folder paths under \`/data/data/com.termux/files/home\` through vanilla Android filepickers.
Using Android's newer **Storage Access Framework (SAF)**, users can define a **DocumentProvider** to bridge Termux's direct database files to external applications. 

Click the **Mount SAF Folder** in the top navigation panel to experience the Android mount connection interface!
`
  },

  // SD Card Folders
  '/sdcard': {
    name: 'sdcard',
    path: '/sdcard',
    type: 'directory',
    children: [
      '/sdcard/Documents',
      '/sdcard/Download'
    ]
  },

  '/sdcard/Documents': {
    name: 'Documents',
    path: '/sdcard/Documents',
    type: 'directory',
    children: [
      '/sdcard/Documents/notes.txt'
    ]
  },

  '/sdcard/Documents/notes.txt': {
    name: 'notes.txt',
    path: '/sdcard/Documents/notes.txt',
    type: 'file',
    content: `Grocery List:
- Fresh milk
- Organic coffee beans
- Whole wheat sourdough
- Bananas
- Fresh green cilantro

Meeting with Termux dev team scheduled tomorrow at 10 AM. Ask about:
1. Native SAF symlinks
2. Go performance on ARM64 Termux binaries
3. Micro colorschemes matching user shell profiles
`
  },

  '/sdcard/Download': {
    name: 'Download',
    path: '/sdcard/Download',
    type: 'directory',
    children: [
      '/sdcard/Download/index.html'
    ]
  },

  '/sdcard/Download/index.html': {
    name: 'index.html',
    path: '/sdcard/Download/index.html',
    type: 'file',
    content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Termux Web Preview</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            background: #1e1e24;
            color: #f7f7f9;
            padding: 2rem;
            text-align: center;
        }
        h1 { color: #f48fb1; }
    </style>
</head>
<body>
    <h1>Hello from Android storage!</h1>
    <p>This file can be opened directly inside of Termux and edited via micro!</p>
</body>
</html>
`
  },

  // SAF Mounted folders (start empty, user triggers SAF authentication flow to link/mount direct /data/data/com.termux file directories!)
  '/saf-termux-mount': {
    name: 'SAF Termux Link (Unlinked)',
    path: '/saf-termux-mount',
    type: 'directory',
    children: [] // will fill when user connects SAF
  }
};
