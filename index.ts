#!/usr/bin/env node
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
import { extractIssuesStructured, matchIssuesToLinear, initializeAnthropic, generateEnrichmentQuestions } from './src/lib/claude';
import { getAnthropicApiKey, getLinearApiKey } from './src/lib/config';
import { symbols, theme, box, separator, tree, actionBadge } from './src/lib/theme';

const program = new Command();

program
  .name('issue')
  .description('CLI tool to manage Linear issues from client feedback')
  .version('0.1.0')
  .option('--tldr', 'Show a brief explanation of what this tool does');

// Handle --tldr flag
program.hook('preAction', (thisCommand, actionCommand) => {
  const opts = thisCommand.opts();
  if (opts.tldr) {
    console.log('\n' + box('AI-Powered Linear Issue Manager', { title: 'ISSUE', style: 'heavy' }));
    console.log('\n' + theme.value('This tool automatically processes unstructured client feedback and updates Linear tickets.\n'));

    console.log(theme.heading('How it works:'));
    console.log(theme.muted('  1. Paste feedback from meetings, emails, or Slack'));
    console.log(theme.muted('  2. AI extracts and categorizes issues'));
    console.log(theme.muted('  3. Smart matching to existing Linear tickets'));
    console.log(theme.muted('  4. Creates new tickets or updates existing ones\n'));

    console.log(theme.heading('Key features:'));
    console.log(theme.muted(`  ${symbols.bullet} AI-powered issue extraction (Claude)`));
    console.log(theme.muted(`  ${symbols.bullet} Intelligent ticket matching`));
    console.log(theme.muted(`  ${symbols.bullet} Multi-action support (create/update/comment)`));
    console.log(theme.muted(`  ${symbols.bullet} Preview mode with --dry-run`));
    console.log(theme.muted(`  ${symbols.bullet} Interactive API key setup\n`));

    console.log(theme.heading('Usage:'));
    console.log(theme.info('  issue              ') + theme.muted('# Start interactive session'));
    console.log(theme.info('  issue --dry-run    ') + theme.muted('# Preview changes only'));
    console.log(theme.info('  issue agent        ') + theme.muted('# For AI agents (tmux mode)'));
    console.log(theme.info('  issue --help       ') + theme.muted('# Show all options\n'));
    process.exit(0);
  }
});

program
  .command('agent')
  .description('Start in tmux session for AI agent interaction')
  .action(async () => {
    const { execSync } = await import('child_process');

    console.log('\n' + theme.subheading(`${symbols.arrow} Agent Mode - Starting in tmux session...\n`));

    const sessionName = `issue-${Date.now()}`;

    try {
      // Check if tmux is available
      execSync('which tmux', { stdio: 'ignore' });

      // Start new tmux session with issues command
      execSync(`tmux new-session -d -s ${sessionName} 'bun run ${process.argv[1]}'`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      console.log(theme.success(`${symbols.success} Started tmux session: `) + theme.label(sessionName));
      console.log(theme.muted('\nAgent Instructions:'));
      console.log(theme.value('To interact with the tool, use tmux commands:\n'));
      console.log(theme.info('  # Send keys to the session'));
      console.log(theme.muted(`  tmux send-keys -t ${sessionName} "your input here" C-m\n`));
      console.log(theme.info('  # Capture pane output'));
      console.log(theme.muted(`  tmux capture-pane -t ${sessionName} -p\n`));
      console.log(theme.info('  # Attach to session (for debugging)'));
      console.log(theme.muted(`  tmux attach -t ${sessionName}\n`));
      console.log(theme.info('  # Kill session when done'));
      console.log(theme.muted(`  tmux kill-session -t ${sessionName}\n`));
      console.log(theme.label('Session name: ') + theme.accent(sessionName));
      console.log(theme.muted('\nThe interactive tool is now running in the tmux session.'));
      console.log(theme.muted('Use tmux commands to send input and read output.\n'));

    } catch (error) {
      console.error(theme.error(`\n${symbols.error} Error: tmux is not installed or not available`));
      console.log(theme.muted('\nTo install tmux:'));
      console.log(theme.muted('  macOS:   brew install tmux'));
      console.log(theme.muted('  Ubuntu:  sudo apt-get install tmux'));
      console.log(theme.muted('  Other:   See https://github.com/tmux/tmux/wiki\n'));
      process.exit(1);
    }
  });

program
  .command('process', { isDefault: true })
  .description('Process client feedback and update Linear tickets')
  .option('--dry-run', 'Preview changes without applying them')
  .action(async (options) => {
    const isDryRun = options.dryRun;
    console.log('\n' + theme.subheading(`${symbols.arrow} Issue Manager - Processing client feedback...\n`));

    // Initialize APIs
    const anthropicKey = await getAnthropicApiKey();
    initializeAnthropic(anthropicKey);

    const linearKey = await getLinearApiKey();
    initializeLinear(linearKey);

    // Step 1: Get the transcript/message
    const transcript = await input({
      message: 'Paste your transcript/message:',
    });

    console.log(theme.muted(`\n${symbols.info} Captured ${transcript.length} characters\n`));

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
    console.log('\n' + theme.success(`${symbols.success} Analysis complete!`));
    console.log(separator(70, symbols.boxHorizontalHeavy));
    console.log(theme.label('Team: ') + theme.value(selectedTeam?.name || 'Unknown'));
    console.log(theme.label('Existing issues: ') + theme.value(existingIssues.length.toString()));

    console.log('\n' + theme.heading('PROPOSED ACTIONS') + '\n');

    processedIssues.forEach((item, index) => {
      const issue = item.extractedIssue;

      // Action badge
      console.log(`  ${actionBadge(item.action)}  ${theme.heading(issue.title)}`);
      console.log(theme.muted(`     ${issue.description}`));

      // Metadata tree
      const metadata = [
        { label: 'Type', value: issue.type },
        { label: 'Priority', value: issue.priority },
      ];

      if (item.matchedIssueIdentifier) {
        metadata.push({ label: 'Target', value: theme.identifier(item.matchedIssueIdentifier) });
      }

      metadata.forEach((meta, i) => {
        const isLast = i === metadata.length - 1;
        const prefix = isLast ? symbols.treeCorner : symbols.treeEdge;
        console.log(theme.muted(`     ${prefix} ${meta.label}: `) + theme.value(meta.value));
      });

      console.log(theme.muted(`\n     ${symbols.info} ${item.reason}`));
      console.log();
    });

    console.log(separator(70, symbols.boxHorizontalHeavy));

    const summary = {
      create: processedIssues.filter(p => p.action === 'create').length,
      update: processedIssues.filter(p => p.action === 'update').length,
      comment: processedIssues.filter(p => p.action === 'comment').length,
    };

    const summaryContent = `Create    ${summary.create}\nUpdate    ${summary.update}\nComment   ${summary.comment}`;
    console.log('\n' + box(summaryContent, { title: 'SUMMARY' }));
    console.log();

    if (isDryRun) {
      console.log(theme.info(`\n${symbols.info} Dry run mode - no changes will be applied\n`));
      return;
    }

    // Step 6: Confirm and execute
    const shouldProceed = await confirm({
      message: 'Proceed with these changes?',
      default: true,
    });

    if (!shouldProceed) {
      console.log(theme.info(`\n${symbols.info} Let's refine these changes...\n`));

      // Ask for natural language feedback
      const feedback = await input({
        message: 'What changes would you like to make? (or press Enter to cancel)',
      });

      if (!feedback.trim()) {
        console.log(theme.warning(`\n${symbols.error} Cancelled. No changes made.`));
        return;
      }

      // Re-analyze with the additional feedback
      console.log(theme.muted(`\n${symbols.info} Re-analyzing with your feedback...\n`));
      const refinedSpinner = ora('Processing your feedback...').start();

      // Combine original transcript with feedback
      const combinedTranscript = `${transcript}\n\nAdditional feedback: ${feedback}`;
      const refinedIssues = await extractIssuesStructured(combinedTranscript);
      const refinedProcessed = await matchIssuesToLinear(refinedIssues, existingIssues);

      refinedSpinner.succeed('Updated analysis complete');

      // Show updated proposed actions
      console.log('\n' + theme.heading('UPDATED PROPOSED ACTIONS') + '\n');

      refinedProcessed.forEach((item, index) => {
        const issue = item.extractedIssue;

        console.log(`  ${actionBadge(item.action)}  ${theme.heading(issue.title)}`);
        console.log(theme.muted(`     ${issue.description}`));

        const metadata = [
          { label: 'Type', value: issue.type },
          { label: 'Priority', value: issue.priority },
        ];

        if (item.matchedIssueIdentifier) {
          metadata.push({ label: 'Target', value: theme.identifier(item.matchedIssueIdentifier) });
        }

        metadata.forEach((meta, i) => {
          const isLast = i === metadata.length - 1;
          const prefix = isLast ? symbols.treeCorner : symbols.treeEdge;
          console.log(theme.muted(`     ${prefix} ${meta.label}: `) + theme.value(meta.value));
        });

        console.log(theme.muted(`\n     ${symbols.info} ${item.reason}`));
        console.log();
      });

      console.log(separator(70, symbols.boxHorizontalHeavy));

      const refinedSummary = {
        create: refinedProcessed.filter(p => p.action === 'create').length,
        update: refinedProcessed.filter(p => p.action === 'update').length,
        comment: refinedProcessed.filter(p => p.action === 'comment').length,
      };

      const refinedSummaryContent = `Create    ${refinedSummary.create}\nUpdate    ${refinedSummary.update}\nComment   ${refinedSummary.comment}`;
      console.log('\n' + box(refinedSummaryContent, { title: 'UPDATED SUMMARY' }));
      console.log();

      if (isDryRun) {
        console.log(theme.info(`\n${symbols.info} Dry run mode - no changes will be applied\n`));
        return;
      }

      // Ask again if they want to proceed
      const shouldProceedRefined = await confirm({
        message: 'Proceed with these updated changes?',
        default: true,
      });

      if (!shouldProceedRefined) {
        console.log(theme.warning(`\n${symbols.error} Cancelled. No changes made.`));
        return;
      }

      // Use the refined processed issues for execution
      processedIssues.length = 0;
      processedIssues.push(...refinedProcessed);
    }

    // Enrich issues with additional context before creating/updating
    console.log('\n' + theme.heading('ENRICHMENT QUESTIONS') + '\n');
    console.log(theme.muted('Let\'s gather some additional context for these issues...\n'));

    for (let i = 0; i < processedIssues.length; i++) {
      const item = processedIssues[i];
      const issue = item.extractedIssue;

      console.log(theme.label(`\n${i + 1}. ${issue.title}`) + theme.muted(` (${item.action})`));

      if (item.action === 'create') {
        // Deadline question - natural language input
        const deadline = await input({
          message: 'When should the deadline be? (e.g., "5 working days", "next friday", "this thursday"):',
        });

        // Time commitment / complexity
        const timeCommitment = await select({
          message: 'Time commitment estimate?',
          choices: [
            { name: 'Brainless', value: 'brainless' },
            { name: '1 hour', value: '1_hour' },
            { name: '3 hour focus', value: '3_hour_focus' },
            { name: '1 day', value: '1_day' },
            { name: '1-2 days', value: '1_2_days' },
            { name: '2+ days', value: '2plus_days' },
          ],
        });

        // Generate contextual questions using Claude
        const contextualQuestions = await generateEnrichmentQuestions(issue, transcript);

        // Store answers to contextual questions
        const contextualAnswers: Record<string, string> = {};

        for (const q of contextualQuestions) {
          const answer = await select({
            message: q.question,
            choices: q.options.map(opt => ({ name: opt.label, value: opt.value })),
          });
          contextualAnswers[q.question] = answer;
        }

        // Append enrichment data to description
        let enrichmentNotes = `\n\n---\n**Deadline:** ${deadline}\n**Time Commitment:** ${timeCommitment}`;

        // Add contextual answers
        if (Object.keys(contextualAnswers).length > 0) {
          enrichmentNotes += '\n\n**Additional Context:**';
          for (const [question, answer] of Object.entries(contextualAnswers)) {
            enrichmentNotes += `\n- ${question} ${answer}`;
          }
        }

        issue.description += enrichmentNotes;
      } else if (item.action === 'update' || item.action === 'comment') {
        // For updates/comments, ask if additional context is needed
        const needsContext = await select({
          message: `Add additional context to this ${item.action}?`,
          choices: [
            { name: 'No, proceed as-is', value: 'no' },
            { name: 'Yes, add notes', value: 'yes' },
          ],
        });

        if (needsContext === 'yes') {
          const additionalContext = await input({
            message: 'Additional context or notes:',
          });

          if (additionalContext.trim()) {
            issue.description += `\n\n**Additional Context:** ${additionalContext}`;
          }
        }
      }
    }

    console.log('\n' + theme.success(`${symbols.success} Enrichment complete!\n`));

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
    console.log('\n' + theme.success(`${symbols.success} Complete!\n`));

    const completionLines: string[] = [];

    if (results.created.length > 0) {
      completionLines.push(theme.action.create.bold('Created') + theme.muted(` (${results.created.length})`));
      results.created.forEach(id => {
        completionLines.push(theme.action.create(`  ${symbols.success} `) + theme.identifier(id));
      });
      completionLines.push('');
    }

    if (results.updated.length > 0) {
      completionLines.push(theme.action.update.bold('Updated') + theme.muted(` (${results.updated.length})`));
      results.updated.forEach(id => {
        completionLines.push(theme.action.update(`  ${symbols.update} `) + theme.identifier(id));
      });
      completionLines.push('');
    }

    if (results.commented.length > 0) {
      completionLines.push(theme.action.comment.bold('Commented') + theme.muted(` (${results.commented.length})`));
      results.commented.forEach(id => {
        completionLines.push(theme.action.comment(`  ${symbols.comment} `) + theme.identifier(id));
      });
      completionLines.push('');
    }

    console.log(box(completionLines.join('\n'), { title: 'RESULTS', style: 'heavy' }));
    console.log();
  });

program.parse();
