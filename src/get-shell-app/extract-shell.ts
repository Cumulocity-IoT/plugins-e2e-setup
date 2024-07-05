import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts the shell app from the given file name to dist/apps.
 * @param fileName The name of the file to extract.
 * @param shellVersion The shell version to extract.
 */
export async function extractShell(
	fileName: string,
	shellVersion: string
): Promise<void> {
	try {
		execSync(`tar -xzf ${fileName}`);
		console.log('Apps extracted successfully.');

		const cockpitFile = `cockpit-${shellVersion}.zip`;
		const destinationFolder = path.join('dist', 'apps', 'cockpit');

		if (!fs.existsSync(destinationFolder)) {
			fs.mkdirSync(destinationFolder, { recursive: true });
		}

		execSync(`unzip -qq ${cockpitFile} -d ${destinationFolder}`);
		console.log('Cockpit extracted successfully.');
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}
