export const squirrelLifecycleArguments = [
  '--squirrel-install',
  '--squirrel-updated',
  '--squirrel-uninstall',
  '--squirrel-obsolete',
] as const;

export const isSquirrelLifecycleInvocation = (
  argv: readonly string[],
): boolean =>
  process.platform === 'win32' &&
  squirrelLifecycleArguments.some((argument) => argv[1] === argument);

export const startMainProcess = (
  argv: readonly string[],
  registerNormalLifecycle: () => void,
): boolean => {
  if (isSquirrelLifecycleInvocation(argv)) {
    return false;
  }

  registerNormalLifecycle();
  return true;
};
