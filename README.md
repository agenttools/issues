# Issue

An AI-powered CLI tool to automatically process client feedback and update Linear tickets.

## Overview

This tool streamlines the process of managing client issues by:
1. Taking unstructured feedback (from meetings, emails, Slack, etc.)
2. Using Claude AI to extract and categorize issues
3. Matching them to existing Linear tickets
4. Creating new tickets or updating existing ones

## Features

- 🤖 **AI-Powered Extraction**: Uses Claude to extract structured issues from unstructured text
- 🎯 **Smart Matching**: Automatically matches new issues to existing Linear tickets
- 📊 **Multi-Action Support**: Create new tickets, update existing ones, or add comments
- 👁️ **Preview Mode**: Dry-run option to preview changes before applying
- ✅ **Confirmation**: Review and approve all changes before they're applied
- 🎨 **Beautiful CLI**: Clean, colorful interface with progress indicators

## Installation

### Install from GitHub

Using npm:
```bash
npm install -g github:agenttools/issue
```

Using bun:
```bash
bun add -g github:agenttools/issue
```

### Install from npm (once published)

```bash
npm install -g @agenttools/issue
```

Or with bun:
```bash
bun add -g @agenttools/issue
```

## Setup

The tool will prompt you for API keys when you first run it. You can choose to save them for future use, or provide them via environment variables.

### Option 1: Interactive Setup (Recommended)

Just run the tool and it will prompt you for:
1. **Anthropic API Key** - Get yours from https://console.anthropic.com/
2. **Linear API Key** - Get yours from https://linear.app/settings/api

The tool will ask if you want to save these keys to `~/.issue/config.json` for future use.

### Option 2: Environment Variables

Set the API keys as environment variables:

```bash
export ANTHROPIC_API_KEY="your-anthropic-key"
export LINEAR_API_KEY="your-linear-key"
```

Or add them to your `.env` file.

## Usage

After installation, simply run:

```bash
issue
```

This will:
1. Prompt for API keys (if not already configured)
2. Ask you to paste your client feedback
3. Let you select which team/client
4. Analyze the feedback with AI
5. Show proposed changes
6. Apply changes after confirmation

### Dry Run Mode

Preview what changes would be made without actually applying them:

```bash
issue --dry-run
```

### Quick Overview

Get a brief explanation of what the tool does:

```bash
issue --tldr
```

### Agent Mode (for AI Agents)

AI agents can use this command to interact with the tool in a tmux session:

```bash
issue agent
```

This will:
1. Start a new tmux session with the tool running
2. Provide instructions for sending inputs and reading outputs
3. Allow the agent to interact programmatically using tmux commands

Example agent workflow:
```bash
# Start agent mode
issue agent

# Send input to the session (use the session name from output)
tmux send-keys -t issue-1234567890 "paste your feedback here" C-m

# Read the output
tmux capture-pane -t issue-1234567890 -p

# Send more input as needed
tmux send-keys -t issue-1234567890 "y" C-m

# Kill session when done
tmux kill-session -t issue-1234567890
```

### Help

View all available options:

```bash
issue --help
```

## Workflow

1. **Paste Feedback**: Paste your client transcript or message
2. **Select Team**: Choose which Linear team/client this is for
3. **AI Analysis**: Claude extracts issues and matches them to existing tickets
4. **Review**: See proposed actions (create/update/comment)
5. **Confirm**: Approve or reject the changes
6. **Execute**: Changes are applied to Linear

## Example

```bash
$ issue

🚀 Issue Manager - Processing client feedback...

? Paste your transcript/message:
The dashboard is loading really slowly for our users.
Also the export button is broken on mobile.

? Which client/team is this for?
❯ Client A - Acme Corp (ACME)
  Client B - TechStart (TECH)
  Client C - DataCo (DATA)

✔ Found 2 existing issues
✔ Extracted 2 issues from transcript
✔ Issue matching complete

✓ Analysis complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Team: Client A - Acme Corp

📋 Proposed Actions:

  1. [UPDATE] Dashboard loading slowly
     Users report the dashboard takes too long to load
     Type: bug | Priority: high
     → ACME-123
     This appears to be a duplicate of existing dashboard performance issue

  2. [UPDATE] Export button broken on mobile
     Export button is not working on mobile devices
     Type: bug | Priority: medium
     → ACME-124
     Matches existing issue about export button

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  0 new tickets to create
  2 tickets to update
  0 comments to add

? Proceed with these changes? (Y/n)
```

## Project Structure

```
issue/
├── index.ts                 # Main CLI entry point
├── src/
│   └── lib/
│       ├── claude.ts       # Claude AI integration
│       ├── linear.ts       # Linear API integration
│       └── config.ts       # API key configuration
├── package.json
└── README.md
```

## Development

The tool is built with:
- **Bun**: Fast JavaScript runtime
- **Commander**: CLI framework
- **@inquirer/prompts**: Interactive prompts
- **Anthropic SDK**: Claude AI integration
- **Linear SDK**: Linear API integration
- **Chalk**: Terminal styling
- **Ora**: Spinners and progress indicators

## For AI Agents

This tool is designed to be used by both humans and AI agents. When using as an AI agent:

1. **Quick Info**: Use `issue --tldr` to understand the tool
2. **Agent Mode**: Use `issue agent` to start in a tmux session for programmatic interaction
3. **Tmux Commands**: The tool provides the exact tmux commands needed to:
   - Send keyboard input to the session
   - Capture and read output from the session
   - Clean up when done

The agent mode creates an isolated tmux session where the interactive CLI runs, allowing full programmatic control.

## Development Roadmap

- [ ] Add more granular error handling
- [ ] Add logging/history of processed feedbacks
- [ ] Support for bulk processing (multiple transcripts)
- [ ] Custom prompt templates
- [ ] Support for attachments/screenshots in issues
- [ ] Integration with other issue trackers (Jira, GitHub Issues)
- [ ] JSON output mode for easier agent parsing

## License

Private
