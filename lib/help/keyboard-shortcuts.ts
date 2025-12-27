// Keyboard shortcuts definitions for FTA Studio

export interface KeyboardShortcut {
  keys: string[]
  description: string
  mac?: string[] // Mac-specific keys
}

export interface ShortcutCategory {
  title: string
  icon: string
  shortcuts: KeyboardShortcut[]
}

export const keyboardShortcuts: ShortcutCategory[] = [
  {
    title: 'General',
    icon: 'Settings',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Ctrl', 'Z'], mac: ['⌘', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], mac: ['⌘', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], mac: ['⌘', 'Shift', 'Z'], description: 'Redo (alternate)' },
      { keys: ['Escape'], description: 'Close dialog / Clear selection' },
    ],
  },
  {
    title: 'Canvas',
    icon: 'GitBranch',
    shortcuts: [
      { keys: ['Delete'], description: 'Delete selected node(s)' },
      { keys: ['Backspace'], description: 'Delete selected node(s)' },
      { keys: ['Ctrl', 'A'], mac: ['⌘', 'A'], description: 'Select all nodes' },
      { keys: ['Shift', 'Click'], description: 'Add to selection' },
      { keys: ['Ctrl', 'Click'], mac: ['⌘', 'Click'], description: 'Toggle selection' },
      { keys: ['Drag'], description: 'Pan canvas' },
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['Ctrl', '+'], mac: ['⌘', '+'], description: 'Zoom in' },
      { keys: ['Ctrl', '-'], mac: ['⌘', '-'], description: 'Zoom out' },
      { keys: ['Ctrl', '0'], mac: ['⌘', '0'], description: 'Fit to screen' },
    ],
  },
  {
    title: 'Table',
    icon: 'Table',
    shortcuts: [
      { keys: ['Enter'], description: 'Edit cell / Confirm & move down' },
      { keys: ['Tab'], description: 'Move to next cell' },
      { keys: ['Shift', 'Tab'], description: 'Move to previous cell' },
      { keys: ['↑', '↓', '←', '→'], description: 'Navigate cells' },
      { keys: ['Alt', '↑', '↓', '←', '→'], description: 'Navigate while editing' },
      { keys: ['Escape'], description: 'Cancel edit' },
      { keys: ['Space'], description: 'Start editing cell' },
    ],
  },
  {
    title: 'Node Editing',
    icon: 'Edit',
    shortcuts: [
      { keys: ['Double Click'], description: 'Edit node label' },
      { keys: ['Enter'], description: 'Confirm edit' },
      { keys: ['Escape'], description: 'Cancel edit' },
    ],
  },
]

// Helper to detect Mac
export function isMac(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

// Get the appropriate key display for the current platform
export function getKeyDisplay(shortcut: KeyboardShortcut): string[] {
  if (isMac() && shortcut.mac) {
    return shortcut.mac
  }
  return shortcut.keys
}
