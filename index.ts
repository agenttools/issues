#!/usr/bin/env bun
import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import {
  fetchTeams,
  fetchIssuesForTeam,
  createIssue,
  addCommentToIssue,
  updateIssue,
  initializeLinear,
  type Team,
} from './src/lib/linear';
import { extractIssuesStructured, matchIssuesToLinear, initializeAnthropic } from './src/lib/claude';
import { getAnthropicApiKey, getLinearApiKey } from './src/lib/config';

const program = new Command();

program
  .name('issue-manager')
  .description('CLI tool to manage Linear issues from client feedback')
  .version('0.1.0');

program
  .command('process', { isDefault: true })
  .description('Process client feedback and update Linear tickets')
  .option('--dry-run', 'Preview changes without applying them')
  .action(async (options) => {
    const isDryRun = options.dryRun;
    console.log(chalk.bold('🚀 Issue Manager - Processing client feedback...\n'));

    // Initialize APIs
    const anthropicKey = await getAnthropicApiKey();
    initializeAnthropic(anthropicKey);

    const linearKey = await getLinearApiKey();
    initializeLinear(linearKey);

    // Step 1: Get the transcript/message
    const transcript = await input({
      message: 'Paste your transcript/message:',
    });

    console.log(chalk.dim(`\n📝 Captured ${transcript.length} characters\n`));

    // Step 2: Fetch teams from Linear
    const teams = await fetchTeams();

    const teamChoices = teams.map(team => ({
      name: `${team.name} (${team.key})`,
      value: team.id,
    }));

    const teamId = await select({
      message: 'Which client/team is this for?',
      choices: teamChoices,
    });

    const selectedTeam = teams.find(t => t.id === teamId);

    // Step 3: Fetch existing issues for this team
    const spinner = ora('Fetching existing issues from Linear...').start();
    const existingIssues = await fetchIssuesForTeam(teamId);
    spinner.succeed(`Found ${existingIssues.length} existing issues`);

    // Step 4: Use Claude to extract issues from transcript
    const aiSpinner = ora('Analyzing transcript with Claude...').start();
    const extractedIssues = await extractIssuesStructured(transcript);
    aiSpinner.succeed(`Extracted ${extractedIssues.length} issues from transcript`);

    // Step 5: Match extracted issues to existing Linear issues
    const matchSpinner = ora('Matching issues to Linear tickets...').start();
    const processedIssues = await matchIssuesToLinear(extractedIssues, existingIssues);
    matchSpinner.succeed('Issue matching complete');

    // Display proposed actions
    console.log('\n' + chalk.green('✓ Analysis complete!'));
    console.log(chalk.dim('━'.repeat(70)));
    console.log(chalk.bold('Team:'), selectedTeam?.name);
    console.log(chalk.bold('Existing issues in Linear:'), existingIssues.length);

    console.log(chalk.bold('\n📋 Proposed Actions:\n'));

    processedIssues.forEach((item, index) => {
      const issue = item.extractedIssue;
      const actionColor =
        item.action === 'create' ? chalk.green :
        item.action === 'update' ? chalk.yellow :
        chalk.blue;

      console.log(actionColor(`  ${index + 1}. [${item.action.toUpperCase()}] ${issue.title}`));
      console.log(chalk.dim(`     ${issue.description}`));
      console.log(chalk.dim(`     Type: ${issue.type} | Priority: ${issue.priority}`));

      if (item.matchedIssueIdentifier) {
        console.log(chalk.dim(`     → ${item.matchedIssueIdentifier}`));
      }

      console.log(chalk.italic.dim(`     ${item.reason}`));
      console.log();
    });

    console.log(chalk.dim('━'.repeat(70)));

    const summary = {
      create: processedIssues.filter(p => p.action === 'create').length,
      update: processedIssues.filter(p => p.action === 'update').length,
      comment: processedIssues.filter(p => p.action === 'comment').length,
    };

    console.log(chalk.bold('\nSummary:'));
    console.log(chalk.green(`  ${summary.create} new tickets to create`));
    console.log(chalk.yellow(`  ${summary.update} tickets to update`));
    console.log(chalk.blue(`  ${summary.comment} comments to add`));
    console.log();

    if (isDryRun) {
      console.log(chalk.cyan('\n💡 Dry run mode - no changes will be applied\n'));
      return;
    }

    // Step 6: Confirm and execute
    const shouldProceed = await confirm({
      message: 'Proceed with these changes?',
      default: true,
    });

    if (!shouldProceed) {
      console.log(chalk.yellow('\n✗ Cancelled. No changes made.'));
      return;
    }

    // Execute the changes
    const execSpinner = ora('Applying changes to Linear...').start();

    const results = {
      created: [] as string[],
      updated: [] as string[],
      commented: [] as string[],
    };

    for (const item of processedIssues) {
      const { extractedIssue, action, matchedIssueId } = item;

      try {
        if (action === 'create') {
          const priorityMap = { low: 1, medium: 2, high: 3, urgent: 4 };
          const newIssue = await createIssue({
            teamId,
            title: extractedIssue.title,
            description: extractedIssue.description,
            priority: priorityMap[extractedIssue.priority],
          });
          results.created.push(newIssue.identifier);
        } else if (action === 'update' && matchedIssueId) {
          await updateIssue(matchedIssueId, {
            description: extractedIssue.description,
          });
          results.updated.push(item.matchedIssueIdentifier || matchedIssueId);
        } else if (action === 'comment' && matchedIssueId) {
          await addCommentToIssue(
            matchedIssueId,
            `New feedback:\n${extractedIssue.description}`
          );
          results.commented.push(item.matchedIssueIdentifier || matchedIssueId);
        }
      } catch (error) {
        execSpinner.fail(`Failed to process: ${extractedIssue.title}`);
        console.error(chalk.red(error));
        return;
      }
    }

    execSpinner.succeed('All changes applied successfully!');

    // Final summary
    console.log(chalk.green.bold('\n✓ Complete!\n'));
    if (results.created.length > 0) {
      console.log(chalk.green('Created:'));
      results.created.forEach(id => console.log(chalk.green(`  ✓ ${id}`)));
    }
    if (results.updated.length > 0) {
      console.log(chalk.yellow('Updated:'));
      results.updated.forEach(id => console.log(chalk.yellow(`  ↻ ${id}`)));
    }
    if (results.commented.length > 0) {
      console.log(chalk.blue('Commented:'));
      results.commented.forEach(id => console.log(chalk.blue(`  💬 ${id}`)));
    }
    console.log();
  });

program.parse();
