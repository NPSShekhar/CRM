import { prisma } from '../config/db.js';

/**
 * Safe Historical Tickets Cleanup Script
 *
 * Cleans up the 145 accidental tickets imported from Gmail historical unread messages
 * (Canva, KuCoin, Anthropic, Instagram, OpenAI, etc.).
 *
 * PRESERVES:
 * - CRM-000013 (Legitimate customer ticket from tvr00095@gmail.com)
 * - CRM-000001 through CRM-000008 (Core seed/demo tickets)
 * - All Customer records
 * - All Gmail emails in the actual Gmail inbox
 *
 * Usage:
 *   npx tsx src/scripts/cleanup-historical-tickets.ts --dry-run
 *   npx tsx src/scripts/cleanup-historical-tickets.ts --execute
 */
async function main() {
  const isExecute = process.argv.includes('--execute');

  console.log('=====================================================');
  console.log('CRM Historical Email Tickets Cleanup Utility');
  console.log(`Mode: ${isExecute ? 'EXECUTE (Modifying DB)' : 'DRY-RUN (Preview Only)'}`);
  console.log('=====================================================\n');

  // Identify historical tickets to clean up
  // These are email-sourced tickets created during the test sync run, excluding CRM-000013
  const targetTickets = await prisma.ticket.findMany({
    where: {
      source: 'EMAIL',
      ticketNumber: { not: 'CRM-000013' },
      createdAt: {
        gte: new Date('2026-11-03T07:04:00Z'),
        lte: new Date('2026-11-03T07:30:00Z'),
      },
    },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      customer: { select: { email: true, name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Identified ${targetTickets.length} historical imported tickets.`);

  if (targetTickets.length === 0) {
    console.log('No historical tickets found to clean up.');
    process.exit(0);
  }

  console.log('\nSample tickets identified for cleanup:');
  targetTickets.slice(0, 10).forEach((t) => {
    console.log(` - [${t.ticketNumber}] "${t.subject}" (${t.customer?.email})`);
  });
  if (targetTickets.length > 10) {
    console.log(`   ... and ${targetTickets.length - 10} more tickets.`);
  }

  // Verify protected tickets are NOT in this list
  const protectedInList = targetTickets.filter((t) => t.ticketNumber === 'CRM-000013');
  if (protectedInList.length > 0) {
    console.error('FATAL SAFETY ERROR: CRM-000013 was found in deletion list! Aborting.');
    process.exit(1);
  }

  if (!isExecute) {
    console.log('\n[DRY RUN COMPLETE] To delete these historical imported tickets, run with:');
    console.log('  npx tsx src/scripts/cleanup-historical-tickets.ts --execute\n');
    process.exit(0);
  }

  const ticketIds = targetTickets.map((t) => t.id);

  console.log('\nExecuting safe cleanup in database...');

  // 1. Delete associated notifications
  const notifResult = await prisma.notification.deleteMany({
    where: { entityId: { in: ticketIds } },
  });
  console.log(`✓ Deleted ${notifResult.count} associated notification records.`);

  // 2. Delete associated email messages
  const emailMsgResult = await prisma.emailMessage.deleteMany({
    where: { ticketId: { in: ticketIds } },
  });
  console.log(`✓ Deleted ${emailMsgResult.count} associated email message records.`);

  // 3. Delete attachments
  const attResult = await prisma.attachment.deleteMany({
    where: { ticketId: { in: ticketIds } },
  });
  console.log(`✓ Deleted ${attResult.count} associated attachment records.`);

  // 4. Delete ticket messages
  const msgResult = await prisma.ticketMessage.deleteMany({
    where: { ticketId: { in: ticketIds } },
  });
  console.log(`✓ Deleted ${msgResult.count} associated ticket messages.`);

  // 5. Delete conversations
  const convResult = await prisma.conversation.deleteMany({
    where: { ticketId: { in: ticketIds } },
  });
  console.log(`✓ Deleted ${convResult.count} associated conversation records.`);

  // 6. Delete tickets
  const ticketResult = await prisma.ticket.deleteMany({
    where: { id: { in: ticketIds } },
  });
  console.log(`✓ Successfully deleted ${ticketResult.count} historical tickets.`);

  console.log('\nCleanup completed safely. Legitimate ticket CRM-000013 and all customer records preserved.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
