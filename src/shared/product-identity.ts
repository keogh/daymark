export const productIdentity = {
  displayName: 'Daymark',
  stable: {
    macosBundleId: 'com.isaaczepeda.timetracker',
    windowsAppUserModelId: 'com.squirrel.timetracker.time-tracker',
    linuxPackageName: 'time-tracker',
    squirrelPackageName: 'timetracker',
    databaseFilename: 'time-tracker.sqlite',
    preloadGlobal: 'timeTracker',
    npmPackageName: 'time-tracker',
    profileDirectoryName: 'Time Tracker',
  },
} as const;
