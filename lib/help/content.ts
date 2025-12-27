// Help content definitions for FTA Studio
// All help content is defined here for type-safety and easy maintenance

export interface HelpArticle {
  slug: string
  title: string
  description: string
  content: HelpSection[]
  videoUrl?: string
  relatedArticles?: string[]
}

export interface HelpSection {
  type: 'text' | 'heading' | 'list' | 'tip' | 'warning' | 'note' | 'steps' | 'table' | 'image'
  content?: string
  items?: string[]
  level?: 2 | 3 | 4
  columns?: string[]
  rows?: string[][]
  src?: string
  alt?: string
  caption?: string
}

export interface HelpCategory {
  id: string
  title: string
  description: string
  icon: string
  articles: HelpArticle[]
}

export const helpCategories: HelpCategory[] = [
  // ============================================
  // GETTING STARTED
  // ============================================
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of FTA Studio',
    icon: 'Rocket',
    articles: [
      {
        slug: 'what-is-fta-studio',
        title: 'What is FTA Studio?',
        description: 'An introduction to Fault Tree Analysis and FTA Studio',
        content: [
          {
            type: 'text',
            content: 'FTA Studio is a modern, collaborative platform for conducting Fault Tree Analysis (FTA) - a systematic method for identifying and analyzing potential causes of system failures or undesired events.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'What is Fault Tree Analysis?',
          },
          {
            type: 'text',
            content: 'Fault Tree Analysis is a top-down, deductive failure analysis technique used in reliability engineering, safety engineering, and root cause analysis. It uses Boolean logic to combine a series of lower-level events to determine the probability of a top-level undesired event.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Key Features',
          },
          {
            type: 'list',
            items: [
              'Visual fault tree canvas with drag-and-drop interface',
              'Synchronized table view for spreadsheet-style editing',
              'Risk assessment with Severity, Occurrence, and Detection (S/O/D) scores',
              'Automatic RPN (Risk Priority Number) calculation',
              'Action item tracking with weekly status updates',
              'AI-powered analysis assistance',
              'Real-time collaboration',
              'Export to Excel, PDF, and images',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'The 9-Why Methodology',
          },
          {
            type: 'text',
            content: 'FTA Studio implements the "9-Why" methodology, allowing you to drill down up to 9 levels deep from your top event to identify root causes. Each level asks "Why did this happen?" to uncover increasingly fundamental causes.',
          },
          {
            type: 'tip',
            content: 'While the tool supports 9 levels, most effective analyses find root causes within 5-7 levels. Focus on finding actionable causes rather than reaching a specific depth.',
          },
        ],
        videoUrl: 'https://example.com/videos/intro',
        relatedArticles: ['quick-start', 'understanding-interface'],
      },
      {
        slug: 'quick-start',
        title: 'Quick Start Guide',
        description: 'Create your first fault tree in 5 minutes',
        content: [
          {
            type: 'text',
            content: 'This guide will walk you through creating your first fault tree analysis in just a few minutes.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Step-by-Step Instructions',
          },
          {
            type: 'steps',
            items: [
              'Navigate to the Analyses page and click "New Analysis"',
              'Enter a name for your analysis (e.g., "Equipment Failure Investigation")',
              'You\'ll be taken to the analysis workspace with an empty canvas',
              'Click "Add Node" to create your first node - this will be your Top Event',
              'Double-click the node to edit its label - describe the failure or undesired event',
              'With the top event selected, click "Add Node" again to add a "Why" - a potential cause',
              'Continue adding causes by selecting a node and adding children',
              'Use the Inspector panel on the right to add details like risk scores and notes',
            ],
          },
          {
            type: 'tip',
            content: 'Use the Table View for rapid data entry - it works like a spreadsheet and automatically syncs with the canvas.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Next Steps',
          },
          {
            type: 'list',
            items: [
              'Add risk scores (Severity, Occurrence, Detection) to prioritize causes',
              'Create action items for causes that need investigation or correction',
              'Invite team members to collaborate in real-time',
              'Export your analysis to share with stakeholders',
            ],
          },
        ],
        videoUrl: 'https://example.com/videos/quick-start',
        relatedArticles: ['understanding-interface', 'canvas-navigation'],
      },
      {
        slug: 'understanding-interface',
        title: 'Understanding the Interface',
        description: 'Learn your way around FTA Studio',
        content: [
          {
            type: 'text',
            content: 'FTA Studio\'s interface is designed to give you multiple ways to view and edit your fault tree analysis.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Main Areas',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Header Bar',
          },
          {
            type: 'text',
            content: 'The header contains the analysis title, metadata tags, status indicator, and action buttons for export, auto-layout, and view switching.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Canvas View',
          },
          {
            type: 'text',
            content: 'The primary workspace showing your fault tree as an interactive diagram. Nodes represent events and causes, while edges show the relationships between them.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Table View',
          },
          {
            type: 'text',
            content: 'A spreadsheet-style view showing the same data in tabular format. Each row represents a path from the top event to a leaf cause. Changes sync automatically with the canvas.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Inspector Panel',
          },
          {
            type: 'text',
            content: 'The right sidebar shows details for the selected node, including risk scores, action items, notes, and AI suggestions. Select a node to view and edit its properties.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Toolbar',
          },
          {
            type: 'text',
            content: 'The left sidebar contains tools for searching nodes, adding new nodes, and other canvas operations.',
          },
          {
            type: 'note',
            content: 'You can toggle between Canvas and Table views using the buttons in the header, or use keyboard shortcuts ⌘+1 and ⌘+2.',
          },
        ],
        relatedArticles: ['canvas-navigation', 'table-overview'],
      },
      {
        slug: 'first-analysis',
        title: 'Your First Analysis',
        description: 'A complete walkthrough of creating an analysis',
        content: [
          {
            type: 'text',
            content: 'Let\'s walk through a complete example of creating a fault tree analysis for a common scenario: investigating why a manufacturing defect occurred.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Scenario',
          },
          {
            type: 'text',
            content: 'A batch of products was shipped with incorrect labels. We need to find the root cause to prevent recurrence.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Step 1: Define the Top Event',
          },
          {
            type: 'text',
            content: 'Start by clearly stating what went wrong. Be specific and measurable.',
          },
          {
            type: 'tip',
            content: 'Good: "Batch #1234 shipped with wrong product labels on 12/15"\nNot ideal: "Labeling problem"',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Step 2: Ask "Why?" Repeatedly',
          },
          {
            type: 'text',
            content: 'For each cause you identify, ask "Why did this happen?" to drill deeper.',
          },
          {
            type: 'list',
            items: [
              'Why were wrong labels applied? → Operator selected wrong label roll',
              'Why did operator select wrong roll? → Labels looked similar',
              'Why did labels look similar? → No color coding system',
              'Why no color coding? → Never implemented after process change',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Step 3: Assess Risk',
          },
          {
            type: 'text',
            content: 'For each potential cause, assess the Severity, Occurrence likelihood, and Detection capability. This helps prioritize which causes to address first.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Step 4: Create Action Items',
          },
          {
            type: 'text',
            content: 'For high-priority causes, create action items to investigate further or implement corrective actions.',
          },
        ],
        videoUrl: 'https://example.com/videos/first-analysis',
        relatedArticles: ['working-with-nodes', 'risk-scores'],
      },
    ],
  },

  // ============================================
  // CANVAS VIEW
  // ============================================
  {
    id: 'canvas-view',
    title: 'Canvas View',
    description: 'Master the visual fault tree editor',
    icon: 'GitBranch',
    articles: [
      {
        slug: 'canvas-navigation',
        title: 'Navigating the Canvas',
        description: 'Learn to pan, zoom, and navigate your fault tree',
        content: [
          {
            type: 'text',
            content: 'The canvas is your primary workspace for visualizing and editing your fault tree. Master these navigation techniques to work efficiently.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Panning',
          },
          {
            type: 'list',
            items: [
              'Click and drag on empty canvas space to pan',
              'Use two-finger scroll on trackpad',
              'Hold Space + drag for pan mode',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Zooming',
          },
          {
            type: 'list',
            items: [
              'Scroll wheel to zoom in/out',
              'Pinch gesture on trackpad',
              '⌘/Ctrl + Plus/Minus keys',
              'Use the zoom controls in the bottom-left corner',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Fit to Screen',
          },
          {
            type: 'text',
            content: 'Click the "Fit" button in the zoom controls or press ⌘/Ctrl + 0 to fit the entire tree in view.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Mini Map',
          },
          {
            type: 'text',
            content: 'For large trees, use the mini-map in the corner to see an overview and quickly navigate to different areas.',
          },
        ],
        relatedArticles: ['working-with-nodes', 'node-types'],
      },
      {
        slug: 'working-with-nodes',
        title: 'Working with Nodes',
        description: 'Add, edit, move, and delete nodes',
        content: [
          {
            type: 'text',
            content: 'Nodes are the building blocks of your fault tree. Each node represents an event or cause in your analysis.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Adding Nodes',
          },
          {
            type: 'list',
            items: [
              'Click "Add Node" button in the toolbar to add a root node',
              'Select a node and click "Add Node" to add a child',
              'Right-click a node for context menu options',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Editing Node Labels',
          },
          {
            type: 'list',
            items: [
              'Double-click a node to edit its label inline',
              'Use the Inspector panel for detailed editing',
              'Press Enter to confirm, Escape to cancel',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Moving Nodes',
          },
          {
            type: 'text',
            content: 'Drag nodes to reposition them. The tree structure (parent-child relationships) remains unchanged - only the visual position changes.',
          },
          {
            type: 'tip',
            content: 'Use Auto-Layout to automatically arrange nodes in a clean hierarchy.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Deleting Nodes',
          },
          {
            type: 'list',
            items: [
              'Select a node and press Delete or Backspace',
              'Right-click and select "Delete"',
              'Use the delete button in the Inspector',
            ],
          },
          {
            type: 'warning',
            content: 'Deleting a node also deletes all its children. Use Undo (⌘/Ctrl + Z) to recover accidentally deleted nodes.',
          },
        ],
        relatedArticles: ['node-types', 'creating-connections'],
      },
      {
        slug: 'node-types',
        title: 'Node Types & Gates',
        description: 'Understanding different node types and logic gates',
        content: [
          {
            type: 'text',
            content: 'FTA Studio supports several node types, each serving a specific purpose in your fault tree.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Node Types',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Top Event',
          },
          {
            type: 'text',
            content: 'The undesired event you\'re analyzing. Every fault tree has exactly one top event at the root. This is typically a failure, defect, or incident you want to prevent.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Intermediate Event',
          },
          {
            type: 'text',
            content: 'Events that result from combinations of other events. These are the "Why" levels in your analysis - causes that themselves have causes.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Basic Event',
          },
          {
            type: 'text',
            content: 'The lowest level events in your tree - root causes that don\'t need further breakdown. These are the actionable items you can address.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Logic Gates',
          },
          {
            type: 'heading',
            level: 3,
            content: 'AND Gate',
          },
          {
            type: 'text',
            content: 'The parent event occurs only if ALL child events occur. Used when multiple conditions must be present simultaneously.',
          },
          {
            type: 'tip',
            content: 'Example: "Fire occurs" requires fuel AND heat AND oxygen - all three must be present.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'OR Gate',
          },
          {
            type: 'text',
            content: 'The parent event occurs if ANY child event occurs. Used when any single cause is sufficient to cause the parent event.',
          },
          {
            type: 'tip',
            content: 'Example: "Power failure" can result from grid outage OR generator failure OR battery depletion - any one is sufficient.',
          },
        ],
        relatedArticles: ['working-with-nodes', 'creating-connections'],
      },
      {
        slug: 'creating-connections',
        title: 'Creating Connections',
        description: 'Connect nodes to build your fault tree structure',
        content: [
          {
            type: 'text',
            content: 'Connections (edges) define the parent-child relationships in your fault tree, showing how causes relate to events.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Adding Connections',
          },
          {
            type: 'list',
            items: [
              'Drag from a node\'s bottom handle to another node\'s top handle',
              'Select a parent node and click "Add Node" to create a connected child',
              'Use the Table View to define relationships through the Why columns',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Connection Rules',
          },
          {
            type: 'list',
            items: [
              'Each node can have one parent (except the top event which has none)',
              'Each node can have multiple children',
              'Circular connections are not allowed',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Removing Connections',
          },
          {
            type: 'text',
            content: 'Click on a connection line to select it, then press Delete. Alternatively, delete the child node to remove the connection.',
          },
        ],
        relatedArticles: ['working-with-nodes', 'auto-layout'],
      },
      {
        slug: 'auto-layout',
        title: 'Auto-Layout',
        description: 'Automatically arrange your fault tree',
        content: [
          {
            type: 'text',
            content: 'Auto-Layout automatically arranges your nodes in a clean, readable hierarchy.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Using Auto-Layout',
          },
          {
            type: 'list',
            items: [
              'Click the "Auto Layout" button in the header toolbar',
              'The algorithm arranges nodes in a top-down hierarchy',
              'Nodes are spaced evenly to prevent overlap',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Layout Direction',
          },
          {
            type: 'text',
            content: 'FTA Studio uses a horizontal (left-to-right) layout by default, with the top event on the left and causes flowing to the right. This matches the natural reading direction for Why chains.',
          },
          {
            type: 'tip',
            content: 'After auto-layout, you can manually adjust individual node positions by dragging them.',
          },
          {
            type: 'note',
            content: 'Auto-layout only affects visual positioning. It does not change the logical structure of your fault tree.',
          },
        ],
        relatedArticles: ['canvas-navigation', 'collapsing-branches'],
      },
      {
        slug: 'collapsing-branches',
        title: 'Collapsing Branches',
        description: 'Hide and show parts of your tree',
        content: [
          {
            type: 'text',
            content: 'Large fault trees can become difficult to navigate. Collapsing branches lets you hide parts of the tree to focus on specific areas.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'How to Collapse',
          },
          {
            type: 'list',
            items: [
              'Click the collapse/expand icon on nodes that have children',
              'A badge shows the count of hidden descendants',
              'Click again to expand and show all children',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Use Cases',
          },
          {
            type: 'list',
            items: [
              'Focus on one branch while hiding others',
              'Reduce visual clutter in large trees',
              'Create a high-level overview for presentations',
              'Hide completed branches to focus on remaining work',
            ],
          },
          {
            type: 'note',
            content: 'Collapsed state is preserved in your session but not saved permanently. Trees always open fully expanded.',
          },
        ],
        relatedArticles: ['canvas-navigation', 'multi-select'],
      },
      {
        slug: 'multi-select',
        title: 'Multi-Select Operations',
        description: 'Select and operate on multiple nodes',
        content: [
          {
            type: 'text',
            content: 'Multi-select allows you to perform operations on multiple nodes simultaneously.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Selection Methods',
          },
          {
            type: 'list',
            items: [
              'Shift + Click to add/remove individual nodes from selection',
              '⌘/Ctrl + Click to toggle node selection',
              '⌘/Ctrl + A to select all nodes',
              'Click empty canvas to clear selection',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Multi-Select Operations',
          },
          {
            type: 'list',
            items: [
              'Delete multiple nodes at once',
              'Drag to move multiple nodes together',
            ],
          },
          {
            type: 'warning',
            content: 'Deleting multiple nodes that have parent-child relationships will delete the entire subtrees involved.',
          },
        ],
        relatedArticles: ['working-with-nodes', 'canvas-navigation'],
      },
    ],
  },

  // ============================================
  // TABLE VIEW
  // ============================================
  {
    id: 'table-view',
    title: 'Table View',
    description: 'Work with your fault tree in spreadsheet format',
    icon: 'Table',
    articles: [
      {
        slug: 'table-overview',
        title: 'Table Structure Overview',
        description: 'Understand how the table represents your fault tree',
        content: [
          {
            type: 'text',
            content: 'The Table View presents your fault tree data in a familiar spreadsheet format, making it easy to enter and review data quickly.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Row Structure',
          },
          {
            type: 'text',
            content: 'Each row in the table represents a complete path from the Top Event down to a leaf cause (Basic Event). If a node has multiple children, it appears in multiple rows.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Column Groups',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Why Columns (Failure Mode → Why 9)',
          },
          {
            type: 'text',
            content: 'The first columns show the cause chain: Failure Mode (top event), Why 1, Why 2, through Why 9. Each represents a level in your fault tree.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Risk Columns (S, O, D, RPN)',
          },
          {
            type: 'text',
            content: 'Severity, Occurrence, and Detection scores for each leaf cause, plus the calculated Risk Priority Number.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Action Columns',
          },
          {
            type: 'text',
            content: 'Investigation items, responsible person, status, results, and weekly progress tracking.',
          },
          {
            type: 'tip',
            content: 'The table automatically syncs with the canvas - edits in either view are immediately reflected in the other.',
          },
        ],
        relatedArticles: ['table-editing', 'table-navigation'],
      },
      {
        slug: 'table-editing',
        title: 'Editing Cells',
        description: 'Edit data directly in the table',
        content: [
          {
            type: 'text',
            content: 'The Table View supports direct cell editing similar to spreadsheet applications.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Entering Edit Mode',
          },
          {
            type: 'list',
            items: [
              'Click on any cell to select it',
              'Press Enter or Space to start editing',
              'Double-click to edit immediately',
              'Start typing to replace cell contents',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Confirming Changes',
          },
          {
            type: 'list',
            items: [
              'Press Enter to confirm and move down',
              'Press Tab to confirm and move right',
              'Click outside the cell',
              'Press Escape to cancel changes',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Cell Types',
          },
          {
            type: 'list',
            items: [
              'Text cells: Free-form text entry',
              'Number cells: Numeric values (1-10 for scores)',
              'Dropdown cells: Select from predefined options',
              'Read-only cells: Calculated values like RPN',
            ],
          },
          {
            type: 'note',
            content: 'Changes are saved automatically. There\'s no need to manually save your work.',
          },
        ],
        relatedArticles: ['table-navigation', 'table-overview'],
      },
      {
        slug: 'table-navigation',
        title: 'Keyboard Navigation',
        description: 'Navigate the table efficiently with keyboard',
        content: [
          {
            type: 'text',
            content: 'Master keyboard navigation to work quickly in the Table View.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Navigation Keys',
          },
          {
            type: 'table',
            columns: ['Key', 'Action'],
            rows: [
              ['Arrow Keys', 'Move between cells'],
              ['Tab', 'Move to next cell'],
              ['Shift + Tab', 'Move to previous cell'],
              ['Enter', 'Edit cell / Confirm & move down'],
              ['Escape', 'Cancel edit / Clear selection'],
              ['Home', 'Jump to first cell in row'],
              ['End', 'Jump to last cell in row'],
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'While Editing',
          },
          {
            type: 'table',
            columns: ['Key', 'Action'],
            rows: [
              ['Alt + Arrow Keys', 'Navigate while keeping edit mode'],
              ['Enter', 'Confirm and move down'],
              ['Tab', 'Confirm and move right'],
              ['Escape', 'Cancel changes'],
            ],
          },
        ],
        relatedArticles: ['table-editing', 'table-overview'],
      },
      {
        slug: 'table-canvas-sync',
        title: 'Canvas Synchronization',
        description: 'How table and canvas stay in sync',
        content: [
          {
            type: 'text',
            content: 'The Table View and Canvas View show the same underlying data. Understanding how they sync helps you work effectively in both.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Real-Time Sync',
          },
          {
            type: 'text',
            content: 'All changes sync instantly between views. Edit a node label in the canvas and see it update in the table immediately, and vice versa.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Selection Sync',
          },
          {
            type: 'text',
            content: 'Selecting a node in the canvas highlights the corresponding rows in the table. Clicking a cell in the table selects the corresponding node in the canvas.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Adding Nodes from Table',
          },
          {
            type: 'text',
            content: 'When you add text to a Why column in the table, new nodes are automatically created in the canvas. The system intelligently reuses existing nodes when the text matches.',
          },
          {
            type: 'tip',
            content: 'The table is great for rapid data entry, while the canvas is better for understanding structure. Use both views to get the best of both worlds.',
          },
        ],
        relatedArticles: ['table-overview', 'canvas-navigation'],
      },
      {
        slug: 'table-search',
        title: 'Filtering & Search',
        description: 'Find and filter data in the table',
        content: [
          {
            type: 'text',
            content: 'Use the search and filter features to quickly find specific data in large tables.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Quick Search',
          },
          {
            type: 'text',
            content: 'Use the search box above the table to filter rows. The search looks across all text columns and shows only matching rows.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Search Tips',
          },
          {
            type: 'list',
            items: [
              'Search is case-insensitive',
              'Partial matches are shown',
              'Clear the search to show all rows',
            ],
          },
        ],
        relatedArticles: ['table-overview', 'table-navigation'],
      },
    ],
  },

  // ============================================
  // RISK ASSESSMENT
  // ============================================
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    description: 'Score and prioritize causes',
    icon: 'AlertTriangle',
    articles: [
      {
        slug: 'risk-scores',
        title: 'Understanding S/O/D Scores',
        description: 'Learn about Severity, Occurrence, and Detection',
        content: [
          {
            type: 'text',
            content: 'Risk assessment in FTA uses three key metrics: Severity, Occurrence, and Detection. Together, these help prioritize which causes to address first.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Severity (S)',
          },
          {
            type: 'text',
            content: 'How serious is the impact if this cause occurs? Rated 1-10 where 10 is most severe.',
          },
          {
            type: 'list',
            items: [
              '1-3: Minor impact, minimal consequences',
              '4-6: Moderate impact, noticeable consequences',
              '7-8: High impact, significant consequences',
              '9-10: Critical impact, catastrophic consequences',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Occurrence (O)',
          },
          {
            type: 'text',
            content: 'How likely is this cause to occur? Rated 1-10 where 10 is most likely.',
          },
          {
            type: 'list',
            items: [
              '1-3: Rare, unlikely to occur',
              '4-6: Occasional, may occur',
              '7-8: Frequent, likely to occur',
              '9-10: Very frequent, almost certain',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Detection (D)',
          },
          {
            type: 'text',
            content: 'How likely is it that we\'ll detect this cause before it causes harm? Rated 1-10 where 10 means hardest to detect.',
          },
          {
            type: 'list',
            items: [
              '1-3: Almost certain detection',
              '4-6: Good chance of detection',
              '7-8: Poor chance of detection',
              '9-10: Almost impossible to detect',
            ],
          },
          {
            type: 'note',
            content: 'Detection is inversely scored - a high number means WORSE detectability (harder to catch).',
          },
        ],
        relatedArticles: ['rpn-calculation', 'action-priority'],
      },
      {
        slug: 'rpn-calculation',
        title: 'RPN Calculation',
        description: 'How Risk Priority Number is calculated',
        content: [
          {
            type: 'text',
            content: 'The Risk Priority Number (RPN) is a single metric that combines Severity, Occurrence, and Detection scores.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'The Formula',
          },
          {
            type: 'text',
            content: 'RPN = Severity × Occurrence × Detection',
          },
          {
            type: 'heading',
            level: 2,
            content: 'RPN Range',
          },
          {
            type: 'list',
            items: [
              'Minimum: 1 × 1 × 1 = 1',
              'Maximum: 10 × 10 × 10 = 1000',
              'Higher RPN = Higher priority for action',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Using RPN',
          },
          {
            type: 'text',
            content: 'Use RPN to rank and prioritize causes. Focus investigation and corrective action efforts on causes with the highest RPN values.',
          },
          {
            type: 'warning',
            content: 'RPN alone shouldn\'t drive all decisions. A cause with S=10, O=1, D=1 (RPN=10) may need more attention than S=3, O=3, D=3 (RPN=27) due to the severe consequences.',
          },
          {
            type: 'tip',
            content: 'FTA Studio calculates RPN automatically when you enter S, O, and D scores.',
          },
        ],
        relatedArticles: ['risk-scores', 'action-priority'],
      },
      {
        slug: 'action-priority',
        title: 'Action Priority (AP) Levels',
        description: 'Categorize risks by priority level',
        content: [
          {
            type: 'text',
            content: 'Action Priority provides a categorical assessment that complements the numeric RPN value.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'AP Levels',
          },
          {
            type: 'list',
            items: [
              'AP-H (High): Immediate action required',
              'AP-M (Medium): Action required, can be planned',
              'AP-L (Low): Monitor, action if convenient',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'How AP is Determined',
          },
          {
            type: 'text',
            content: 'Your organization can configure AP mapping rules based on S, O, D combinations or RPN thresholds. This is managed in Admin Settings → AP Mapping.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Default Rules',
          },
          {
            type: 'list',
            items: [
              'Severity = 10: Always AP-H regardless of other scores',
              'RPN > 200: AP-H',
              'RPN 100-200: AP-M',
              'RPN < 100: AP-L',
            ],
          },
          {
            type: 'note',
            content: 'These default rules can be customized to match your organization\'s risk tolerance and industry standards.',
          },
        ],
        relatedArticles: ['rpn-calculation', 'custom-scales'],
      },
      {
        slug: 'custom-scales',
        title: 'Custom Scales',
        description: 'Customize S/O/D scale definitions',
        content: [
          {
            type: 'text',
            content: 'Organizations can customize the definitions for each score level to match their specific context and industry standards.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Accessing Scale Settings',
          },
          {
            type: 'text',
            content: 'Administrators can manage scales in Admin Settings → Scales & Criteria.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'What You Can Customize',
          },
          {
            type: 'list',
            items: [
              'Description for each score level (1-10)',
              'Examples to help users select appropriate scores',
              'Industry-specific criteria',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Scale Versions',
          },
          {
            type: 'text',
            content: 'FTA Studio supports multiple scale versions. When you update scales, existing analyses keep their original scale definitions for consistency.',
          },
          {
            type: 'tip',
            content: 'Create industry-specific scales for different types of analyses (e.g., safety vs. quality vs. reliability).',
          },
        ],
        relatedArticles: ['risk-scores', 'action-priority'],
      },
      {
        slug: 'judgment-values',
        title: 'Judgment Values',
        description: 'Track verification status of causes',
        content: [
          {
            type: 'text',
            content: 'Judgment values help track whether causes have been verified through investigation.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Judgment Scale',
          },
          {
            type: 'list',
            items: [
              '1 - Root cause confirmed',
              '2 - Likely root cause',
              '3 - Possible contributing factor',
              '4 - Unlikely to be a cause',
              '5 - Ruled out',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Using Judgment Values',
          },
          {
            type: 'text',
            content: 'Start with causes marked as hypotheses (no judgment). As investigations complete, update the judgment to reflect findings.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Evidence Status',
          },
          {
            type: 'text',
            content: 'Each cause can be marked as "Hypothesis" (unverified) or "Verified" (confirmed through investigation). This is separate from the numeric judgment value.',
          },
        ],
        relatedArticles: ['risk-scores', 'creating-actions'],
      },
    ],
  },

  // ============================================
  // ACTION ITEMS
  // ============================================
  {
    id: 'action-items',
    title: 'Action Items',
    description: 'Track investigations and corrective actions',
    icon: 'CheckSquare',
    articles: [
      {
        slug: 'creating-actions',
        title: 'Creating Action Items',
        description: 'Add action items to track work',
        content: [
          {
            type: 'text',
            content: 'Action items track the work needed to investigate causes and implement corrective actions.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Adding Action Items',
          },
          {
            type: 'list',
            items: [
              'Select a node in the canvas',
              'Open the Inspector panel',
              'Click "Add Action" in the Actions section',
              'Or use the Table View to add items directly',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Action Item Fields',
          },
          {
            type: 'list',
            items: [
              'Investigation Item: What needs to be done',
              'Hypothesis: What you expect to find',
              'Test Method: How you\'ll verify',
              'Pass/Fail Criteria: What constitutes success',
              'Person Responsible: Who owns this action',
              'Due Date: When it should be completed',
            ],
          },
          {
            type: 'tip',
            content: 'Write clear, specific investigation items. "Check the logs" is vague; "Review server logs from 2pm-4pm on 12/15 for error messages" is actionable.',
          },
        ],
        relatedArticles: ['investigation-workflow', 'weekly-status'],
      },
      {
        slug: 'investigation-workflow',
        title: 'Investigation Workflow',
        description: 'Follow a structured investigation process',
        content: [
          {
            type: 'text',
            content: 'A structured investigation workflow helps ensure thorough root cause analysis.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Recommended Workflow',
          },
          {
            type: 'steps',
            items: [
              'Identify potential causes and add them to the fault tree',
              'Create investigation actions for each potential cause',
              'Define clear hypotheses and pass/fail criteria',
              'Assign responsible persons and due dates',
              'Execute investigations and collect evidence',
              'Update status weekly to track progress',
              'Record results and update judgment values',
              'Mark causes as verified or ruled out',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Hypothesis-Driven Investigation',
          },
          {
            type: 'text',
            content: 'Each investigation should test a specific hypothesis. This prevents fishing expeditions and ensures investigations are focused and efficient.',
          },
          {
            type: 'tip',
            content: 'Use the AI Investigation Quality feature to get suggestions for improving your investigation plans.',
          },
        ],
        relatedArticles: ['creating-actions', 'weekly-status'],
      },
      {
        slug: 'weekly-status',
        title: 'Weekly Status Tracking',
        description: 'Track action progress over time',
        content: [
          {
            type: 'text',
            content: 'Weekly status tracking provides visibility into action item progress over a 4-week period.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Status Columns',
          },
          {
            type: 'text',
            content: 'The table includes Week 1-4 columns to track progress. Each week can be marked with a status indicator.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Status Options',
          },
          {
            type: 'list',
            items: [
              'Not Started (blank)',
              'In Progress (yellow)',
              'Completed (green)',
              'Blocked (red)',
              'N/A (gray)',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Best Practices',
          },
          {
            type: 'list',
            items: [
              'Update status at least weekly',
              'Add notes explaining blockers',
              'Escalate items that stay blocked',
              'Celebrate completions!',
            ],
          },
        ],
        relatedArticles: ['creating-actions', 'assigning-responsibility'],
      },
      {
        slug: 'assigning-responsibility',
        title: 'Assigning Responsibility',
        description: 'Assign owners to action items',
        content: [
          {
            type: 'text',
            content: 'Every action item should have a clear owner responsible for completion.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'People Directory',
          },
          {
            type: 'text',
            content: 'FTA Studio maintains a People Directory of assignable individuals. Administrators can manage this in Admin Settings → People Directory.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Assigning People',
          },
          {
            type: 'list',
            items: [
              'Select from the Person dropdown in action items',
              'Type to search for names',
              'People can be assigned to multiple actions',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'My Actions View',
          },
          {
            type: 'text',
            content: 'Users can view all actions assigned to them in the "My Actions" page, making it easy to track personal workload.',
          },
        ],
        relatedArticles: ['creating-actions', 'weekly-status'],
      },
      {
        slug: 'evidence-attachments',
        title: 'Evidence & Attachments',
        description: 'Attach evidence to support findings',
        content: [
          {
            type: 'text',
            content: 'Attach evidence to action items to document investigation findings.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Types of Evidence',
          },
          {
            type: 'list',
            items: [
              'Photos and images',
              'Documents and PDFs',
              'Data exports and spreadsheets',
              'Links to external resources',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Adding Evidence',
          },
          {
            type: 'list',
            items: [
              'Select an action item',
              'Click "Add Evidence" in the Inspector',
              'Upload files or enter links',
              'Add descriptions to explain the evidence',
            ],
          },
          {
            type: 'tip',
            content: 'Good evidence is specific, dated, and clearly tied to the hypothesis being tested.',
          },
        ],
        relatedArticles: ['investigation-workflow', 'creating-actions'],
      },
    ],
  },

  // ============================================
  // AI FEATURES
  // ============================================
  {
    id: 'ai-features',
    title: 'AI Features',
    description: 'Get AI-powered analysis assistance',
    icon: 'Sparkles',
    articles: [
      {
        slug: 'ai-overview',
        title: 'AI Features Overview',
        description: 'Introduction to AI assistance in FTA Studio',
        content: [
          {
            type: 'text',
            content: 'FTA Studio includes AI-powered features to help improve the quality and completeness of your analyses.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Available AI Features',
          },
          {
            type: 'list',
            items: [
              'Metadata Assistant: Suggests metadata fields based on analysis content',
              'Why Quality: Analyzes cause statements for clarity and actionability',
              'Investigation Quality: Reviews investigation plans for completeness',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'How AI Suggestions Work',
          },
          {
            type: 'list',
            items: [
              'AI analyzes your analysis content',
              'Suggestions appear in the Quality panel',
              'Review each suggestion carefully',
              'Accept to apply, or dismiss if not relevant',
            ],
          },
          {
            type: 'warning',
            content: 'AI suggestions are recommendations, not requirements. Always apply your domain expertise when deciding whether to accept suggestions.',
          },
        ],
        relatedArticles: ['metadata-assist', 'why-quality', 'investigation-quality'],
      },
      {
        slug: 'metadata-assist',
        title: 'Metadata Assistant',
        description: 'Get help completing analysis metadata',
        content: [
          {
            type: 'text',
            content: 'The Metadata Assistant analyzes your fault tree content and suggests appropriate metadata values.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'What It Suggests',
          },
          {
            type: 'list',
            items: [
              'Industry classification',
              'Issue category',
              'Problem summary',
              'Abstract/executive summary',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Using the Feature',
          },
          {
            type: 'steps',
            items: [
              'Open the Metadata panel in the analysis header',
              'Click "AI Assist" button',
              'Review the suggested values',
              'Click checkmark to accept, X to dismiss',
            ],
          },
          {
            type: 'tip',
            content: 'The AI provides better suggestions when your fault tree has more content. Add nodes and labels before requesting suggestions.',
          },
        ],
        relatedArticles: ['ai-overview', 'why-quality'],
      },
      {
        slug: 'why-quality',
        title: 'Why Quality Analysis',
        description: 'Improve cause statement quality',
        content: [
          {
            type: 'text',
            content: 'The Why Quality feature analyzes your cause statements and suggests improvements for clarity, specificity, and actionability.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Quality Checks',
          },
          {
            type: 'list',
            items: [
              'Vague wording detection',
              'Missing specificity',
              'Non-actionable causes',
              'Duplicate or redundant statements',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Common Issues Detected',
          },
          {
            type: 'list',
            items: [
              '"Operator error" → Too vague, what specific error?',
              '"Process failure" → Which process? What failure mode?',
              '"Not following procedure" → Which procedure? What step?',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Reviewing Suggestions',
          },
          {
            type: 'text',
            content: 'Open the Quality panel (flag icon in header) to see suggestions. Each shows the original text, the issue, and a suggested improvement.',
          },
        ],
        relatedArticles: ['ai-overview', 'investigation-quality'],
      },
      {
        slug: 'investigation-quality',
        title: 'Investigation Quality Checks',
        description: 'Improve investigation plan quality',
        content: [
          {
            type: 'text',
            content: 'The Investigation Quality feature reviews your action items to ensure investigation plans are complete and well-structured.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Quality Checks',
          },
          {
            type: 'list',
            items: [
              'Missing hypothesis',
              'Vague investigation methods',
              'Missing pass/fail criteria',
              'Overly broad scope',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Good Investigation Structure',
          },
          {
            type: 'text',
            content: 'A well-structured investigation includes:',
          },
          {
            type: 'list',
            items: [
              'Clear hypothesis: "If X is the cause, then we should see Y"',
              'Specific method: How exactly will you investigate?',
              'Pass/fail criteria: What result confirms or rules out the hypothesis?',
              'Evidence type: What evidence will you collect?',
            ],
          },
          {
            type: 'tip',
            content: 'Click "Apply Fix" to automatically update the investigation with the suggested improvements.',
          },
        ],
        relatedArticles: ['ai-overview', 'investigation-workflow'],
      },
      {
        slug: 'ai-suggestions-review',
        title: 'Reviewing AI Suggestions',
        description: 'Best practices for evaluating AI suggestions',
        content: [
          {
            type: 'text',
            content: 'AI suggestions are tools to help you, not replace your judgment. Here\'s how to evaluate them effectively.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Evaluation Criteria',
          },
          {
            type: 'list',
            items: [
              'Is the suggestion relevant to your specific context?',
              'Does it align with your organization\'s standards?',
              'Does it improve clarity without changing meaning?',
              'Would a colleague find the suggestion helpful?',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'When to Accept',
          },
          {
            type: 'list',
            items: [
              'The suggestion clearly improves quality',
              'The suggestion catches a real oversight',
              'The suggested wording is more precise',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'When to Dismiss',
          },
          {
            type: 'list',
            items: [
              'The suggestion doesn\'t fit your context',
              'Your original wording is actually more appropriate',
              'The suggestion changes the intended meaning',
              'You have domain knowledge that makes the suggestion irrelevant',
            ],
          },
          {
            type: 'note',
            content: 'Dismissing suggestions is completely fine. The AI doesn\'t have full context of your situation.',
          },
        ],
        relatedArticles: ['ai-overview', 'why-quality', 'investigation-quality'],
      },
    ],
  },

  // ============================================
  // IMPORT & EXPORT
  // ============================================
  {
    id: 'import-export',
    title: 'Import & Export',
    description: 'Move data in and out of FTA Studio',
    icon: 'FileInput',
    articles: [
      {
        slug: 'excel-import',
        title: 'Importing from Excel',
        description: 'Import existing analyses from Excel files',
        content: [
          {
            type: 'text',
            content: 'FTA Studio can import fault tree data from Excel spreadsheets, making it easy to migrate existing analyses.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Supported Format',
          },
          {
            type: 'text',
            content: 'Import files should have columns for the failure mode and Why levels. The importer will map columns to FTA Studio fields.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Import Steps',
          },
          {
            type: 'steps',
            items: [
              'Click "Import Excel" on the Analyses page',
              'Select your Excel file (.xlsx)',
              'Map columns to FTA fields',
              'Preview the import',
              'Click "Import" to create the analysis',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Column Mapping',
          },
          {
            type: 'text',
            content: 'The importer tries to automatically detect columns. You can manually adjust mappings if needed:',
          },
          {
            type: 'list',
            items: [
              'Failure Mode / Top Event',
              'Why 1 through Why 9',
              'Severity, Occurrence, Detection',
              'Investigation items and status',
            ],
          },
          {
            type: 'warning',
            content: 'Large files may take a few moments to process. Avoid closing the browser during import.',
          },
        ],
        relatedArticles: ['excel-export', 'pdf-export'],
      },
      {
        slug: 'excel-export',
        title: 'Excel Export',
        description: 'Export your analysis to Excel',
        content: [
          {
            type: 'text',
            content: 'Export your complete analysis to Excel for sharing, reporting, or archival.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'What\'s Included',
          },
          {
            type: 'text',
            content: 'The Excel export includes multiple worksheets:',
          },
          {
            type: 'list',
            items: [
              'Main Data: Complete table view with all columns',
              'Metadata: Analysis title, dates, and metadata fields',
              'Risk Summary: RPN distribution and statistics',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Export Steps',
          },
          {
            type: 'steps',
            items: [
              'Open your analysis',
              'Click the "Export" button in the header',
              'Select "Excel (.xlsx)"',
              'The file will download automatically',
            ],
          },
          {
            type: 'tip',
            content: 'The exported Excel file can be re-imported if you need to make bulk edits externally.',
          },
        ],
        relatedArticles: ['excel-import', 'pdf-export'],
      },
      {
        slug: 'pdf-export',
        title: 'PDF Reports',
        description: 'Generate professional PDF reports',
        content: [
          {
            type: 'text',
            content: 'Generate formatted PDF reports for sharing with stakeholders or archival.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Report Contents',
          },
          {
            type: 'list',
            items: [
              'Cover page with analysis title and metadata',
              'Executive summary',
              'Fault tree diagram (image)',
              'Complete data table',
              'Risk summary and statistics',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Export Steps',
          },
          {
            type: 'steps',
            items: [
              'Open your analysis',
              'Click "Export" in the header',
              'Select "PDF Report"',
              'The PDF will be generated and downloaded',
            ],
          },
          {
            type: 'note',
            content: 'PDF generation may take a few seconds for large analyses.',
          },
        ],
        relatedArticles: ['excel-export', 'image-export'],
      },
      {
        slug: 'image-export',
        title: 'Image Export (PNG/SVG)',
        description: 'Export the fault tree as an image',
        content: [
          {
            type: 'text',
            content: 'Export your fault tree diagram as an image for use in presentations, reports, or documentation.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Format Options',
          },
          {
            type: 'list',
            items: [
              'PNG: Raster format, good for presentations',
              'SVG: Vector format, scales without quality loss',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Export Steps',
          },
          {
            type: 'steps',
            items: [
              'Open your analysis',
              'Arrange the canvas as you want it to appear',
              'Click "Export" in the header',
              'Select "Image (.png)" or "Image (.svg)"',
            ],
          },
          {
            type: 'tip',
            content: 'Use Auto-Layout before exporting for the cleanest appearance.',
          },
        ],
        relatedArticles: ['pdf-export', 'auto-layout'],
      },
      {
        slug: 'template-downloads',
        title: 'Template Downloads',
        description: 'Download templates for import',
        content: [
          {
            type: 'text',
            content: 'Download template files to help prepare data for import.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Available Templates',
          },
          {
            type: 'list',
            items: [
              'Basic FTA Template: Minimal structure for simple analyses',
              'Full FTA Template: All columns including risk scores and actions',
              'Example Analysis: A completed example to learn from',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Using Templates',
          },
          {
            type: 'steps',
            items: [
              'Download the appropriate template',
              'Fill in your data following the column structure',
              'Save the file',
              'Import using the Excel Import feature',
            ],
          },
        ],
        relatedArticles: ['excel-import', 'excel-export'],
      },
    ],
  },

  // ============================================
  // BEST PRACTICES & FAQ
  // ============================================
  {
    id: 'best-practices',
    title: 'Best Practices',
    description: 'Tips for effective root cause analysis',
    icon: 'Lightbulb',
    articles: [
      {
        slug: 'effective-rca',
        title: 'Effective Root Cause Analysis',
        description: 'Principles for finding true root causes',
        content: [
          {
            type: 'text',
            content: 'Root cause analysis is only effective when it leads to actionable findings that prevent recurrence.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Key Principles',
          },
          {
            type: 'heading',
            level: 3,
            content: '1. Focus on Systems, Not Blame',
          },
          {
            type: 'text',
            content: '"Operator error" is rarely a root cause. Ask why the system allowed the error to occur or propagate.',
          },
          {
            type: 'heading',
            level: 3,
            content: '2. Look for Multiple Causes',
          },
          {
            type: 'text',
            content: 'Most failures have multiple contributing factors. Use AND gates when multiple conditions were necessary.',
          },
          {
            type: 'heading',
            level: 3,
            content: '3. Stop at Actionable Causes',
          },
          {
            type: 'text',
            content: 'Stop drilling down when you reach a cause you can actually address. Going deeper into organizational history rarely helps.',
          },
          {
            type: 'heading',
            level: 3,
            content: '4. Verify Before Concluding',
          },
          {
            type: 'text',
            content: 'Don\'t assume causes without evidence. Use the investigation workflow to verify each hypothesis.',
          },
          {
            type: 'tip',
            content: 'A good root cause is specific enough to suggest a specific corrective action.',
          },
        ],
        relatedArticles: ['writing-good-whys', 'common-pitfalls'],
      },
      {
        slug: 'writing-good-whys',
        title: 'Writing Good Why Statements',
        description: 'How to write clear, actionable cause statements',
        content: [
          {
            type: 'text',
            content: 'The quality of your analysis depends on how clearly you state causes.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Characteristics of Good Why Statements',
          },
          {
            type: 'list',
            items: [
              'Specific: Names exactly what happened',
              'Measurable: Can be verified with evidence',
              'Causal: Explains how it contributed to the parent event',
              'Actionable: Points toward possible corrective actions',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Examples',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Poor vs. Good',
          },
          {
            type: 'list',
            items: [
              '❌ "Training issue" → ✅ "Operator not trained on new labeling procedure implemented 3/15"',
              '❌ "Equipment failure" → ✅ "Pressure sensor #42 failed to trigger alarm at >150 PSI"',
              '❌ "Communication problem" → ✅ "Shift change notes did not include temperature deviation from 2pm"',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Questions to Ask',
          },
          {
            type: 'list',
            items: [
              'What specifically happened?',
              'When and where did it happen?',
              'How does this cause the parent event?',
              'What would we look for to verify this?',
            ],
          },
        ],
        relatedArticles: ['effective-rca', 'common-pitfalls'],
      },
      {
        slug: 'common-pitfalls',
        title: 'Common FTA Pitfalls',
        description: 'Mistakes to avoid in your analysis',
        content: [
          {
            type: 'text',
            content: 'Learn from common mistakes to improve your analyses.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Common Mistakes',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Jumping to Solutions',
          },
          {
            type: 'text',
            content: 'Don\'t start proposing fixes before understanding root causes. Complete the analysis first.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Stopping Too Soon',
          },
          {
            type: 'text',
            content: '"Operator error" or "procedure not followed" are symptoms, not root causes. Ask why the error was possible.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Going Too Deep',
          },
          {
            type: 'text',
            content: 'Conversely, don\'t trace causes back to the founding of the company. Stop when you reach actionable causes.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Single-Cause Thinking',
          },
          {
            type: 'text',
            content: 'Most failures have multiple contributing causes. Don\'t stop after finding one plausible cause.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Confirmation Bias',
          },
          {
            type: 'text',
            content: 'Investigate all plausible causes, not just the ones you expect. Use evidence to confirm or rule out each one.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Neglecting Systemic Factors',
          },
          {
            type: 'text',
            content: 'Look beyond immediate technical causes to management systems, training, and organizational factors.',
          },
        ],
        relatedArticles: ['effective-rca', 'writing-good-whys'],
      },
      {
        slug: 'industry-guidelines',
        title: 'Industry Guidelines',
        description: 'Standards and references for FTA',
        content: [
          {
            type: 'text',
            content: 'Fault Tree Analysis is used across many industries with various standards and guidelines.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Relevant Standards',
          },
          {
            type: 'list',
            items: [
              'IEC 61025: Fault Tree Analysis',
              'MIL-STD-1629A: FMECA',
              'SAE J1739: Potential Failure Mode and Effects Analysis',
              'ISO 31000: Risk Management',
              'AS/NZS 4360: Risk Management',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Industry Applications',
          },
          {
            type: 'list',
            items: [
              'Aerospace: Safety-critical system analysis',
              'Automotive: Quality and reliability',
              'Healthcare: Patient safety and incident investigation',
              'Manufacturing: Quality control and process improvement',
              'Energy: Nuclear and process safety',
            ],
          },
          {
            type: 'note',
            content: 'Your organization may have specific requirements for documentation and methodology. Check with your quality or safety department.',
          },
        ],
        relatedArticles: ['effective-rca', 'custom-scales'],
      },
    ],
  },

  // ============================================
  // FAQ
  // ============================================
  {
    id: 'faq',
    title: 'FAQ',
    description: 'Frequently asked questions',
    icon: 'HelpCircle',
    articles: [
      {
        slug: 'general-faq',
        title: 'Frequently Asked Questions',
        description: 'Common questions and answers',
        content: [
          {
            type: 'heading',
            level: 2,
            content: 'General',
          },
          {
            type: 'heading',
            level: 3,
            content: 'How do I recover deleted nodes?',
          },
          {
            type: 'text',
            content: 'Use Undo (⌘/Ctrl + Z) immediately after deletion. The undo history supports up to 50 operations.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Is my data saved automatically?',
          },
          {
            type: 'text',
            content: 'Yes, all changes are saved automatically as you work. There\'s no manual save needed.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Can multiple people edit at the same time?',
          },
          {
            type: 'text',
            content: 'Yes, FTA Studio supports real-time collaboration. You\'ll see other users\' cursors and changes appear instantly.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Canvas & Table',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Why doesn\'t my table match my canvas?',
          },
          {
            type: 'text',
            content: 'They should always match. If you notice discrepancies, try refreshing the page. Contact support if the issue persists.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Can I print the fault tree?',
          },
          {
            type: 'text',
            content: 'Export to PDF or image for printing. The PDF report provides a formatted printable document.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Data & Security',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Where is my data stored?',
          },
          {
            type: 'text',
            content: 'Data is stored securely in cloud servers with encryption at rest and in transit. Contact your administrator for details on your organization\'s data handling.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'Can I export all my data?',
          },
          {
            type: 'text',
            content: 'Yes, you can export any analysis to Excel which includes all data. For bulk export of multiple analyses, contact support.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Account & Access',
          },
          {
            type: 'heading',
            level: 3,
            content: 'How do I add users to my organization?',
          },
          {
            type: 'text',
            content: 'Organization administrators can add users in Admin Settings → User Management. Users receive an email invitation to join.',
          },
          {
            type: 'heading',
            level: 3,
            content: 'I forgot my password',
          },
          {
            type: 'text',
            content: 'Use the "Forgot Password" link on the login page to receive a reset email.',
          },
        ],
        relatedArticles: [],
      },
    ],
  },

  // ============================================
  // VIDEO TUTORIALS
  // ============================================
  {
    id: 'video-tutorials',
    title: 'Video Tutorials',
    description: 'Watch and learn',
    icon: 'Video',
    articles: [
      {
        slug: 'video-index',
        title: 'Video Tutorial Library',
        description: 'All video tutorials in one place',
        content: [
          {
            type: 'text',
            content: 'Learn FTA Studio through our video tutorial series. Each video focuses on a specific feature or workflow.',
          },
          {
            type: 'heading',
            level: 2,
            content: 'Getting Started Series',
          },
          {
            type: 'list',
            items: [
              '🎬 Introduction to FTA Studio (Coming Soon)',
              '🎬 Creating Your First Analysis (Coming Soon)',
              '🎬 Understanding the Interface (Coming Soon)',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Feature Deep Dives',
          },
          {
            type: 'list',
            items: [
              '🎬 Mastering the Canvas View (Coming Soon)',
              '🎬 Working with the Table View (Coming Soon)',
              '🎬 Risk Assessment Fundamentals (Coming Soon)',
              '🎬 Action Item Management (Coming Soon)',
              '🎬 Using AI Features (Coming Soon)',
            ],
          },
          {
            type: 'heading',
            level: 2,
            content: 'Advanced Topics',
          },
          {
            type: 'list',
            items: [
              '🎬 Import and Export Workflows (Coming Soon)',
              '🎬 Collaboration Features (Coming Soon)',
              '🎬 Admin Configuration (Coming Soon)',
            ],
          },
          {
            type: 'note',
            content: 'Video tutorials are currently in development. Check back soon for new content, or subscribe to be notified when videos are available.',
          },
        ],
        relatedArticles: ['quick-start', 'understanding-interface'],
      },
    ],
  },
]

// Helper function to get all articles as a flat list for search
export function getAllArticles(): (HelpArticle & { categoryId: string; categoryTitle: string })[] {
  const articles: (HelpArticle & { categoryId: string; categoryTitle: string })[] = []

  for (const category of helpCategories) {
    for (const article of category.articles) {
      articles.push({
        ...article,
        categoryId: category.id,
        categoryTitle: category.title,
      })
    }
  }

  return articles
}

// Helper function to get article by category and slug
export function getArticle(categoryId: string, slug: string): HelpArticle | null {
  const category = helpCategories.find(c => c.id === categoryId)
  if (!category) return null
  return category.articles.find(a => a.slug === slug) || null
}

// Helper function to get category by ID
export function getCategory(categoryId: string): HelpCategory | null {
  return helpCategories.find(c => c.id === categoryId) || null
}

// Search articles by query
export function searchArticles(query: string): (HelpArticle & { categoryId: string; categoryTitle: string })[] {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return []

  const allArticles = getAllArticles()

  return allArticles.filter(article => {
    // Search in title
    if (article.title.toLowerCase().includes(lowerQuery)) return true
    // Search in description
    if (article.description.toLowerCase().includes(lowerQuery)) return true
    // Search in content
    for (const section of article.content) {
      if (section.content?.toLowerCase().includes(lowerQuery)) return true
      if (section.items?.some(item => item.toLowerCase().includes(lowerQuery))) return true
    }
    return false
  })
}
