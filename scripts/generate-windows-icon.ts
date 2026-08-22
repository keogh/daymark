import fs from 'node:fs/promises';
import path from 'node:path';

import pngToIco from 'png-to-ico';

const sourcePath = path.resolve('assets/icon/time-tracker.png');
const outputPath = path.resolve('assets/icon/time-tracker.ico');

const icon = await pngToIco(sourcePath);
await fs.writeFile(outputPath, icon);

console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
