# How to Install Mermaid Extension

## For VS Code / Cursor

### Method 1: Via Extensions Marketplace (Easiest)

1. **Open Extensions Panel**:
   - Press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux)
   - Or click the Extensions icon in the sidebar

2. **Search for Mermaid**:
   - Type "Mermaid" in the search box
   - Look for: **"Markdown Preview Mermaid Support"** by `bierner`

3. **Install**:
   - Click the "Install" button
   - Wait for installation to complete

4. **Restart** (if prompted):
   - Reload the window or restart VS Code/Cursor

### Method 2: Via Command Line

```bash
# For VS Code
code --install-extension bierner.markdown-mermaid

# For Cursor (if it supports CLI)
cursor --install-extension bierner.markdown-mermaid
```

### Method 3: Manual Installation

1. Go to: https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid
2. Click "Install" (will open in VS Code/Cursor)
3. Confirm installation

## Verify Installation

1. Open `docs/DATABASE_SCHEMA.md`
2. Press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux) to open Markdown preview
3. You should see the Mermaid diagram rendered!

## Alternative: Online Viewers

If you prefer not to install an extension:

1. **Mermaid Live Editor**: https://mermaid.live/
   - Copy the mermaid code block from `DATABASE_SCHEMA.md`
   - Paste it into the editor
   - See the rendered diagram

2. **GitHub**: 
   - Push to GitHub
   - GitHub automatically renders Mermaid diagrams in markdown files

3. **dbdiagram.io**:
   - Use the `database_schema.dbml` file
   - Go to https://dbdiagram.io
   - Import the DBML file for an interactive diagram

## Recommended Extension

**Markdown Preview Mermaid Support** by Matt Bierner
- Extension ID: `bierner.markdown-mermaid`
- Provides Mermaid diagram rendering in Markdown preview
- Works with VS Code, Cursor, and other VS Code-based editors

