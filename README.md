# Issue

An AI-powered CLI tool to automatically process client feedback and update Linear tickets with intelligent context gathering and natural language deadline parsing.

## Overview

This tool streamlines the process of managing client issues by:
1. Taking unstructured feedback (from meetings, emails, Slack, etc.)
2. **Gathering contextual information** through AI-generated follow-up questions
3. Using Claude AI to extract and categorize issues with enriched context
4. **Parsing natural language deadlines** (e.g., "next friday", "5 working days")
5. Matching issues to existing Linear tickets
6. Creating new tickets or updating existing ones **with due dates automatically set**

## Features

- 🤖 **AI-Powered Extraction**: Uses Claude Sonnet 4.5 to extract structured issues from unstructured text
- 🎯 **Smart Matching**: Automatically matches new issues to existing Linear tickets
- 🗓️ **Smart Deadlines**: Choose from preset options or write-in custom deadlines (parsed with AI)
- 📋 **Contextual Enrichment**: AI automatically generates up to 6 follow-up questions based on your feedback
- 🔢 **Agent-Friendly Interface**: Numbered options (1-7) with write-in support for AI agent control
- ⚡ **Quick Mode**: Skip enrichment questions with `issue quick` for fast processing
- ♻️ **Refinement Workflow**: Cancel and refine with natural language feedback before creating issues
- 📊 **Multi-Action Support**: Create new tickets, update existing ones, or add comments
- 👁️ **Preview Mode**: Dry-run option to preview changes before applying
- ✅ **Confirmation**: Review and approve all changes before they're applied
- 🎨 **Beautiful CLI**: Clean, colorful interface with progress indicators

## Installation

### Install from npm

```bash
npm install -g @agenttools/issue
```

Or with bun:
```bash
bun add -g @agenttools/issue
```

Or directly with npx (no install):
```bash
npx @agenttools/issue
```

### Install from GitHub

Using npm:
```bash
npm install -g github:agenttools/issue
```

Using bun:
```bash
bun add -g github:agenttools/issue
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

### Workflow

1. **Paste Feedback**: Paste your client transcript or message
2. **Enrichment Questions** (automatic):
   - Answer up to 6 AI-generated contextual questions about the feedback
   - Each question has 2-4 options plus write-in (option 5)
   - Questions adapt to your specific feedback
3. **Select Team**: Choose which Linear team/client this is for
4. **AI Analysis**: Claude extracts issues using enriched context and matches them to existing tickets
5. **Review**: See proposed actions (create/update/comment)
6. **Set Deadlines**: For each new issue, choose from:
   - 1. Write-in (custom deadline)
   - 2. Tuesday (after today)
   - 3. Wednesday (after today)
   - 4. Thursday (after today)
   - 5. Friday (after today)
   - 6. No deadline
   - 7. 1 week
7. **Refine** (if needed): Cancel and provide feedback to regenerate with adjustments
8. **Confirm**: Approve the changes
9. **Execute**: Changes are applied to Linear with due dates automatically set

### Quick Mode

Skip all enrichment questions for fast processing:

```bash
issue quick           # Fast mode without enrichment
issue quick --dry-run # Quick mode with preview
```

### Dry Run Mode

Preview what changes would be made without actually applying them:

```bash
issue --dry-run
issue process --dry-run
```

### Skip Enrichment (Alternative to Quick Mode)

```bash
issue --skip-enrichment
issue process --skip-enrichment
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

# Send numbered choice (e.g., option 2)
tmux send-keys -t issue-1234567890 "2" C-m

# Send confirmation
tmux send-keys -t issue-1234567890 "y" C-m

# Kill session when done
tmux kill-session -t issue-1234567890
```

### Help

View all available options:

```bash
issue --help
```

## Example

```bash
$ issue

→ Issue Manager - Processing client feedback...

✔ Paste your transcript/message:
The dashboard is loading really slowly for our users.
Also the export button is broken on mobile.
We need this fixed ASAP.

ℹ Captured 124 characters

ENRICHMENT QUESTIONS

✔ Would you like to answer follow-up questions for better context? Yes

✔ When should the deadline be? next friday
✓ Deadline set to: 2025-01-17

⠼ Generating contextual questions...
✓ Generated 3 questions

✔ What is the urgency level of these issues?
  1. Critical - blocking users
  2. High - impacting many users
  3. Medium - affecting some users
  4. Low - minor inconvenience
  › 1. Critical - blocking users

✔ Are there any technical constraints to be aware of?
  1. Performance optimization needed
  2. Mobile-specific issue
  3. Both performance and mobile
  4. Other (write in)
  › 3. Both performance and mobile

✔ What is the expected user impact?
  1. All users affected
  2. Mobile users only
  3. Desktop users only
  4. Other (write in)
  › 1. All users affected

✔ Which client/team is this for? Acme Corp (ACME)
✔ Found 2 existing issues
✔ Extracted 2 issues from transcript
✔ Issue matching complete

✓ Analysis complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Team: Acme Corp
Existing issues: 2

PROPOSED ACTIONS

  ● UPDATE  Dashboard Performance Issue
     Users experiencing slow dashboard load times, critical priority due to impact on all users
     ├─ Type: bug
     └─ Priority: urgent

     ℹ Matches existing performance issue ACME-123, updating with new context

  ● CREATE  Mobile Export Button Broken
     Export functionality not working on mobile devices, affecting user workflows
     ├─ Type: bug
     └─ Priority: high

     ℹ No existing issue found for mobile export button

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─ SUMMARY ──┐
│ Create    1 │
│ Update    1 │
│ Comment   0 │
└─────────────┘

✔ Proceed with these changes? Yes

⠼ Applying changes to Linear...
✓ All changes applied successfully!

✓ Complete!

┏━ RESULTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                ┃
┃ Created (1)                                    ┃
┃   ✓ ACME-125                                   ┃
┃                                                ┃
┃ Updated (1)                                    ┃
┃   ↻ ACME-123                                   ┃
┃                                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Enrichment Questions

The tool **automatically** uses Claude to generate up to 6 contextual questions based on your specific feedback. These questions help gather important context that improves issue extraction and prioritization.

**Question Topics:**
- Design or engineering approach
- Clarification on what the issue is
- Clarification on how the issue should be solved

**Question Format:**
- Each question has 2-4 multiple choice options
- Option 5 is always "Other (write in)" for custom responses
- Extra spacing between questions for readability

### Deadline Options

After reviewing proposed actions, you'll set deadlines for each new issue with **7 numbered options**:

1. **Write-in** - Enter any custom deadline (e.g., "next monday", "january 15", "2 weeks")
2. **Tuesday (after today)** - Next Tuesday
3. **Wednesday (after today)** - Next Wednesday
4. **Thursday (after today)** - Next Thursday
5. **Friday (after today)** - Next Friday
6. **No deadline** - Skip setting a deadline
7. **1 week** - 7 days from today

Custom deadlines are automatically parsed by AI and converted to ISO dates for Linear.

### Agent-Friendly Design

All questions use numbered options for easy AI agent control:
- Enrichment questions: Options 1-4 with option 5 as write-in
- Deadline questions: Options 1-7 with option 1 as write-in
- Perfect for programmatic interaction via tmux
- Clear numbering makes LLM selection straightforward

## Refinement Workflow

If you're not satisfied with the proposed actions, you can:

1. Cancel when asked "Proceed with these changes?"
2. Provide natural language feedback on what to change
3. The tool re-analyzes with your feedback and shows updated proposals
4. Review and confirm the refined changes

Example:
```
✔ Proceed with these changes? No

ℹ Let's refine these changes...

✔ What changes would you like to make? Make both issues high priority and combine them into one issue

ℹ Re-analyzing with your feedback...

⠼ Processing your feedback...
✓ Updated analysis complete

UPDATED PROPOSED ACTIONS
...
```

## Project Structure

```
issue/
├── index.ts                 # Main CLI entry point
├── src/
│   └── lib/
│       ├── claude.ts       # Claude AI integration (issue extraction, enrichment, date parsing)
│       ├── linear.ts       # Linear API integration
│       ├── config.ts       # API key configuration
│       └── theme.ts        # CLI styling and theming
├── package.json
└── README.md
```

## Development

The tool is built with:
- **Bun**: Fast JavaScript runtime
- **TypeScript**: Type-safe development
- **Commander**: CLI framework
- **@inquirer/prompts**: Interactive prompts
- **Anthropic SDK**: Claude 4.5 Sonnet integration
- **Linear SDK**: Linear API integration
- **Chalk**: Terminal styling
- **Ora**: Spinners and progress indicators

### Local Development

```bash
# Install dependencies
bun install

# Run locally
bun run dev

# Build
bun run build

# Link globally for testing
npm link
```

## For AI Agents

This tool is designed to be used by both humans and AI agents. When using as an AI agent:

1. **Quick Info**: Use `issue --tldr` to understand the tool
2. **Agent Mode**: Use `issue agent` to start in a tmux session for programmatic interaction
3. **Quick Mode**: Use `issue quick` to skip enrichment questions for faster processing
4. **Numbered Options**:
   - Enrichment questions: Options 1-4 with option 5 as write-in
   - Deadline questions: Options 1-7 with option 1 as write-in
5. **Write-in Support**: Always accessible via numbered option
6. **Tmux Commands**: The tool provides the exact tmux commands needed to:
   - Send keyboard input to the session
   - Capture and read output from the session
   - Clean up when done

The agent mode creates an isolated tmux session where the interactive CLI runs, allowing full programmatic control.

## Changelog

### v0.2.9 (Latest)
- Simplified deadline options to 7 choices focused on weekdays
- Write-in moved to option 1 for easy LLM access
- Added Wednesday to deadline options
- Streamlined UX for faster deadline selection

### v0.2.8
- Increased enrichment questions from 3 to up to 6
- Added more question topics: timeline, urgency, stakeholder involvement
- Improved context gathering for complex feedback

### v0.2.7
- Enrichment questions now automatic by default (no confirmation prompt)
- Added `issue quick` command to skip enrichment questions
- Added `--skip-enrichment` flag

### v0.2.6
- Replaced deadline free text with numbered select options (1-10)
- Added preset deadline choices: 1-5 working days, weekdays
- Suppressed punycode deprecation warning

### v0.2.5
- Moved deadline question to per-issue basis (ask for each issue separately)
- Changed write-in option to number 5 for LLM accessibility
- Added extra spacing between questions

### v0.2.4
- Added LLM-powered natural language deadline parsing
- Move enrichment questions before issue extraction for better context
- Automatic Linear issue due date setting
- Numbered multiple choice options with write-in support

### v0.2.3
- Fixed version display
- Removed debug output
- Added option to skip enrichment questions

### v0.2.2
- Added refinement workflow after cancellation
- Enrichment questions for additional context

### v0.2.1
- Fixed crash from invalid issueIndex values
- Added validation for Claude responses

### v0.2.0
- Major design elevation with professional CLI styling
- Improved visual hierarchy and spacing

## License

MIT
