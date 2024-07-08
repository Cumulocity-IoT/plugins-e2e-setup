import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts the shell app from the given file name to dist/apps.
 * @param shellName Name of the shell
 * @param zipFileName The name of the file to extract.
 * @param shellVersion The shell version to extract.
 */
export async function extractShell(
	shellName: string,
	zipFileName: string,
	shellVersion: string
): Promise<void> {
	try {
		execSync(`tar -xzf ${zipFileName}`);
		console.log('Apps extracted successfully.');

		const shellFile = `${shellName}-${shellVersion}.zip`;
		const destinationFolder = path.join('dist', 'apps', shellName);

		if (!fs.existsSync(destinationFolder)) {
			fs.mkdirSync(destinationFolder, { recursive: true });
		}

		execSync(`unzip -qq ${shellFile} -d ${destinationFolder}`);
		console.log(`Shell ${shellName} extracted successfully.`);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}
