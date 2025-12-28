export type Migration = {
  version: number;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
};
