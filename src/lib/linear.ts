/**
 * Linear SDK integration
 */

import { LinearClient } from '@linear/sdk';

let linearClient: LinearClient;

/**
 * Initialize the Linear client with the provided API key
 */
export function initializeLinear(apiKey: string): void {
  linearClient = new LinearClient({ apiKey });
}

export interface Team {
  id: string;
  name: string;
  key: string;
}

/**
 * Fetch all teams from Linear
 */
export async function fetchTeams(): Promise<Team[]> {
  const teams = await linearClient.teams();

  return teams.nodes.map(team => ({
    id: team.id,
    name: team.name,
    key: team.key,
  }));
}

export interface Issue {
  id: string;
  identifier: string; // e.g., "ACME-123"
  title: string;
  description: string | null;
  priority: number;
  state: string;
}

/**
 * Fetch issues for a specific team
 */
export async function fetchIssuesForTeam(teamId: string): Promise<Issue[]> {
  const issues = await linearClient.issues({
    filter: {
      team: { id: { eq: teamId } },
    },
  });

  return issues.nodes.map(issue => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description || null,
    priority: issue.priority,
    state: issue.state?.name || 'Unknown',
  }));
}

/**
 * Create a new issue in Linear
 */
export async function createIssue(params: {
  teamId: string;
  title: string;
  description: string;
  priority: number;
}): Promise<Issue> {
  const issuePayload = await linearClient.createIssue({
    teamId: params.teamId,
    title: params.title,
    description: params.description,
    priority: params.priority,
  });

  const createdIssue = await issuePayload.issue;
  if (!createdIssue) {
    throw new Error('Failed to create issue');
  }

  return {
    id: createdIssue.id,
    identifier: createdIssue.identifier,
    title: createdIssue.title,
    description: createdIssue.description || null,
    priority: createdIssue.priority,
    state: createdIssue.state?.name || 'Unknown',
  };
}

/**
 * Add a comment to an existing Linear issue
 */
export async function addCommentToIssue(issueId: string, comment: string): Promise<void> {
  await linearClient.createComment({
    issueId,
    body: comment,
  });
}

/**
 * Update an existing Linear issue
 */
export async function updateIssue(
  issueId: string,
  updates: {
    description?: string;
    priority?: number;
  }
): Promise<void> {
  await linearClient.updateIssue(issueId, updates);
}
