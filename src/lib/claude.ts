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

/**
 * Strip markdown code blocks from JSON responses
 */
function stripMarkdownCodeBlocks(text: string): string {
  // Remove ```json and ``` wrapping
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
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
    max_tokens: 8048,
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

Return ONLY a valid JSON array. Example format:
[
  {
    "title": "Issue title",
    "description": "Issue description",
    "type": "bug",
    "priority": "high"
  }
]`,
      },
      {
        role: 'assistant',
        content: '[',
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Expected text response from Claude');
  }

  // Parse the JSON response (prepend [ since we prefilled it)
  try {
    const jsonText = '[' + content.text.trim();
    console.log('DEBUG - Attempting to parse:', jsonText.substring(0, 200) + '...');
    const issues = JSON.parse(jsonText);
    return issues as ExtractedIssue[];
  } catch (error) {
    console.error('\nDEBUG - Raw response from Claude:');
    console.error('Length:', content.text.length);
    console.error('First 100 chars:', JSON.stringify(content.text.substring(0, 100)));
    console.error('Last 100 chars:', JSON.stringify(content.text.substring(content.text.length - 100)));
    console.error('\nAfter prepending [:');
    console.error('[' + content.text);
    console.error('\nParse error:', error);
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
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: '[' },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Expected text response from Claude');
  }

  try {
    const jsonText = '[' + content.text.trim();
    const matches: Array<{
      issueIndex: number;
      action: 'create' | 'update' | 'comment';
      matchedIssueIdentifier?: string;
      reason: string;
    }> = JSON.parse(jsonText);

    return matches
      .filter(match => {
        // Validate issueIndex is within bounds
        if (match.issueIndex < 0 || match.issueIndex >= extractedIssues.length) {
          console.warn(`Warning: Invalid issueIndex ${match.issueIndex} (valid range: 0-${extractedIssues.length - 1}). Skipping this match.`);
          return false;
        }
        return true;
      })
      .map(match => {
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
    console.error('Failed to parse Claude matching response:', '[' + content.text);
    console.error('Full error:', error);
    throw new Error('Claude did not return valid JSON for matching');
  }
}

export interface EnrichmentQuestion {
  question: string;
  options: Array<{ label: string; value: string }>;
}

/**
 * Generate contextual enrichment questions for an issue
 * Returns up to 4 multiple choice questions based on the issue content
 */
export async function generateEnrichmentQuestions(
  issue: ExtractedIssue,
  transcript: string
): Promise<EnrichmentQuestion[]> {
  const prompt = `Based on this issue and the original client feedback, generate 2-4 contextual multiple choice questions to enrich the ticket with relevant information.

Issue:
Title: ${issue.title}
Description: ${issue.description}
Type: ${issue.type}
Priority: ${issue.priority}

Original Feedback:
${transcript}

Generate questions that would help the developer understand:
- Specific requirements or preferences mentioned
- Technical constraints or considerations
- User experience expectations
- Integration points or dependencies

Each question should have 2-4 options. Return as JSON:
[
  {
    "question": "Question text?",
    "options": [
      { "label": "Option 1", "value": "option_1" },
      { "label": "Option 2", "value": "option_2" }
    ]
  }
]

Return ONLY valid JSON. Generate 2-4 questions.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: '[' },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Expected text response from Claude');
  }

  try {
    const jsonText = '[' + content.text.trim();
    const questions: EnrichmentQuestion[] = JSON.parse(jsonText);
    return questions;
  } catch (error) {
    console.error('Failed to parse enrichment questions:', '[' + content.text);
    console.error('Full error:', error);
    throw new Error('Claude did not return valid JSON for enrichment questions');
  }
}
