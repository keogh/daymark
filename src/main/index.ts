import squirrelStartup from 'electron-squirrel-startup';

import { registerApplicationLifecycle } from './app/lifecycle';
import { startMainProcess } from './app/windows-startup';

// Importing electron-squirrel-startup performs the required shortcut work and
// requests application exit. Keep the explicit argument guard here so normal
// initialization is never registered for an installer lifecycle invocation.
void squirrelStartup;
startMainProcess(process.argv, registerApplicationLifecycle);
