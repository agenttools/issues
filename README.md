# Issue

CLI tool for processing client feedback and updating Linear tickets.

## What it does

Takes unstructured feedback and:
1. Extracts issues using Claude Sonnet 4.5
2. Matches them to existing Linear tickets
3. Creates new tickets or updates existing ones
4. Sets due dates from natural language input

Optional: gathers context through follow-up questions before extraction.

## Installation

```bash
npm install -g @agenttools/issue
```

## Setup

Run the tool and it will prompt you for:
1. Anthropic API Key (https://console.anthropic.com/)
2. Linear API Key (https://linear.app/settings/api)

Keys are saved to `~/.issue/config.json`.

## Usage

```bash
issue
```

### Workflow

1. Paste feedback
2. Answer contextual questions (optional, skip with `issue quick`)
3. Select team
4. Review proposed actions
5. Set deadlines for new issues
6. Confirm and apply changes

### Commands

```bash
issue              # Standard mode with questions
issue quick        # Skip questions
```

### Agent Mode

For programmatic interaction via tmux:

```bash
issue agent
```

Starts the tool in a tmux session. Use tmux commands to send input and capture output.

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

After reviewing proposed actions, you'll set deadlines for each new issue with **numbered options**:

1. **Write-in** - Enter any custom deadline (e.g., "next monday", "january 15", "2 weeks")
2. **Tuesday (after today)** - Next Tuesday
3. **Wednesday (after today)** - Next Wednesday
4. **Thursday (after today)** - Next Thursday
5. **Friday (after today)** - Next Friday
6. **No deadline** - Skip setting a deadline
7. **1 week** - 7 days from today

Custom deadlines are automatically parsed by AI and converted to ISO dates for Linear.


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


## For AI Agents

This tool is designed to be used by both humans and AI agents. When using as an AI agent:

1. **Quick Info**: Use `issue --tldr` to understand the tool
2. **Agent Mode**: Use `issue agent` to start in a tmux session for programmatic interaction

The agent mode creates an isolated tmux session where the interactive CLI runs, allowing full programmatic control.



## License

MIT
