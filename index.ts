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
  .name('issues')
  .description('CLI tool to manage Linear issues from client feedback')
  .version('0.1.0')
  .option('--tldr', 'Show a brief explanation of what this tool does');

// Handle --tldr flag
program.hook('preAction', (thisCommand, actionCommand) => {
  const opts = thisCommand.opts();
  if (opts.tldr) {
    console.log(chalk.bold.cyan('\n📝 Issues - AI-Powered Linear Issue Manager\n'));
    console.log(chalk.white('This tool automatically processes unstructured client feedback and updates Linear tickets.\n'));
    console.log(chalk.bold('How it works:'));
    console.log(chalk.dim('  1. Paste feedback from meetings, emails, or Slack'));
    console.log(chalk.dim('  2. AI extracts and categorizes issues'));
    console.log(chalk.dim('  3. Smart matching to existing Linear tickets'));
    console.log(chalk.dim('  4. Creates new tickets or updates existing ones\n'));
    console.log(chalk.bold('Key features:'));
    console.log(chalk.dim('  • AI-powered issue extraction (Claude)'));
    console.log(chalk.dim('  • Intelligent ticket matching'));
    console.log(chalk.dim('  • Multi-action support (create/update/comment)'));
    console.log(chalk.dim('  • Preview mode with --dry-run'));
    console.log(chalk.dim('  • Interactive API key setup\n'));
    console.log(chalk.bold('Usage:'));
    console.log(chalk.cyan('  issues              ') + chalk.dim('# Start interactive session'));
    console.log(chalk.cyan('  issues --dry-run    ') + chalk.dim('# Preview changes only'));
    console.log(chalk.cyan('  issues --agent      ') + chalk.dim('# For AI agents (tmux mode)'));
    console.log(chalk.cyan('  issues --help       ') + chalk.dim('# Show all options\n'));
    process.exit(0);
  }
});

program
  .command('agent')
  .description('Start in tmux session for AI agent interaction')
  .action(async () => {
    const { execSync } = await import('child_process');

    console.log(chalk.bold.cyan('\n🤖 Agent Mode - Starting in tmux session...\n'));

    const sessionName = `issues-${Date.now()}`;

    try {
      // Check if tmux is available
      execSync('which tmux', { stdio: 'ignore' });

      // Start new tmux session with issues command
      execSync(`tmux new-session -d -s ${sessionName} 'bun run ${process.argv[1]}'`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      console.log(chalk.green('✓ Started tmux session:'), chalk.bold(sessionName));
      console.log(chalk.dim('\nAgent Instructions:'));
      console.log(chalk.white('To interact with the tool, use tmux commands:\n'));
      console.log(chalk.cyan('  # Send keys to the session'));
      console.log(chalk.dim(`  tmux send-keys -t ${sessionName} "your input here" C-m\n`));
      console.log(chalk.cyan('  # Capture pane output'));
      console.log(chalk.dim(`  tmux capture-pane -t ${sessionName} -p\n`));
      console.log(chalk.cyan('  # Attach to session (for debugging)'));
      console.log(chalk.dim(`  tmux attach -t ${sessionName}\n`));
      console.log(chalk.cyan('  # Kill session when done'));
      console.log(chalk.dim(`  tmux kill-session -t ${sessionName}\n`));
      console.log(chalk.bold.yellow('Session name: ') + chalk.bold(sessionName));
      console.log(chalk.dim('\nThe interactive tool is now running in the tmux session.'));
      console.log(chalk.dim('Use tmux commands to send input and read output.\n'));

    } catch (error) {
      console.error(chalk.red('\n✗ Error: tmux is not installed or not available'));
      console.log(chalk.dim('\nTo install tmux:'));
      console.log(chalk.dim('  macOS:   brew install tmux'));
      console.log(chalk.dim('  Ubuntu:  sudo apt-get install tmux'));
      console.log(chalk.dim('  Other:   See https://github.com/tmux/tmux/wiki\n'));
      process.exit(1);
    }
  });

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
