import { runMigrations, rollbackLastMigration } from './runner';

const main = async (): Promise<void> => {
  const cmd = process.argv[2] || 'up';

  if (cmd === 'up') {
    await runMigrations();
    return;
  }

  if (cmd === 'rollback' || cmd === 'down') {
    await rollbackLastMigration();
    return;
  }

  throw new Error(`Unknown migration command: ${cmd}`);
};

main().catch((err: any) => {
  // eslint-disable-next-line no-console
  console.error(err?.message || String(err));
  process.exit(1);
});
