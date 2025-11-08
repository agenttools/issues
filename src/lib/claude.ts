import Anthropic from '@anthropic-ai/sdk';
import type { Issue } from './linear';

/**
 * Claude API integration for extracting issues from text
 */

let anthropic: Anthropic;

/**
 * Initialize the Anthropic client with the provided API key
 */
export function initializeAnthropic(apiKey: string): void {
  anthropic = new Anthropic({ apiKey });
}

export interface ExtractedIssue {
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'improvement' | 'question';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ProcessedIssue {
  extractedIssue: ExtractedIssue;
  action: 'create' | 'update' | 'comment';
  matchedIssueId?: string;
  matchedIssueIdentifier?: string;
  reason: string;
}

/**
 * Extract structured issues from transcript using Claude
 */
export async function extractIssuesStructured(transcript: string): Promise<ExtractedIssue[]> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Extract all issues, problems, or feature requests from this client feedback and return them as a JSON array.

For each issue, provide:
- title: A concise title (5-10 words)
- description: A brief description (1-2 sentences)
- type: One of: "bug", "feature", "improvement", "question"
- priority: One of: "low", "medium", "high", "urgent"

Client feedback:
${transcript}

Return ONLY a valid JSON array with no additional text. Example format:
[
  {
    "title": "Issue title",
    "description": "Issue description",
    "type": "bug",
    "priority": "high"
  }
]`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Expected text response from Claude');
  }

  // Parse the JSON response
  try {
    const issues = JSON.parse(content.text);
    return issues as ExtractedIssue[];
  } catch (error) {
    console.error('Failed to parse Claude response as JSON:', content.text);
    throw new Error('Claude did not return valid JSON');
  }
}

/**
 * Simple test - extract issues from transcript
 */
export async function extractIssuesSimple(transcript: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Extract the issues or problems mentioned in this client feedback:\n\n${transcript}\n\nList each issue briefly.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === 'text') {
    return content.text;
  }

  return 'No text response received';
}

/**
 * Match extracted issues to existing Linear issues
 * Determines whether to create, update, or comment on issues
 */
export async function matchIssuesToLinear(
  extractedIssues: ExtractedIssue[],
  existingIssues: Issue[]
): Promise<ProcessedIssue[]> {
  const prompt = `You are helping match newly reported issues to existing Linear issues.

Existing Linear issues:
${existingIssues.map(issue => `- ${issue.identifier}: ${issue.title}${issue.description ? '\n  Description: ' + issue.description : ''}`).join('\n')}

Newly extracted issues from client feedback:
${extractedIssues.map((issue, i) => `${i + 1}. ${issue.title}\n   Description: ${issue.description}\n   Type: ${issue.type}, Priority: ${issue.priority}`).join('\n\n')}

For each newly extracted issue, determine if you should:
- "create": Create a new Linear ticket (no similar existing issue found)
- "update": Update an existing ticket (very similar issue exists)
- "comment": Add a comment to an existing ticket (related but not the same)

Return a JSON array with one entry per extracted issue:
[
  {
    "issueIndex": 0,
    "action": "create" | "update" | "comment",
    "matchedIssueIdentifier": "ACME-123" (only if action is update or comment),
    "reason": "Brief explanation of why this action was chosen"
  }
]

Return ONLY valid JSON.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Expected text response from Claude');
  }

  try {
    const matches: Array<{
      issueIndex: number;
      action: 'create' | 'update' | 'comment';
      matchedIssueIdentifier?: string;
      reason: string;
    }> = JSON.parse(content.text);

    return matches.map(match => {
      const matchedIssue = match.matchedIssueIdentifier
        ? existingIssues.find(i => i.identifier === match.matchedIssueIdentifier)
        : undefined;

      return {
        extractedIssue: extractedIssues[match.issueIndex],
        action: match.action,
        matchedIssueId: matchedIssue?.id,
        matchedIssueIdentifier: match.matchedIssueIdentifier,
        reason: match.reason,
      };
    });
  } catch (error) {
    console.error('Failed to parse Claude matching response:', content.text);
    throw new Error('Claude did not return valid JSON for matching');
  }
}
