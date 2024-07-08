import { getInput, setFailed } from '@actions/core';
import { downloadShellApp } from './download-shell-app';
import { extractShell } from './extract-shell';
import fs from 'fs';

const SHELL_NAMES = ['cockpit', 'devicemanagement', 'administration'];

/**
 * This action downloads the shell app, extracts it to dist/apps folder.
 */
const performAction = async () => {
	const shellName = getInput('shell-name');
	if (!shellName) {
		throw new Error(
			`"shell-name" input is required. Possible shells are: ${SHELL_NAMES.join(
				', '
			)}`
		);
	}
	if (!SHELL_NAMES.includes(shellName)) {
		throw new Error(
			`Shell "${shellName}" is not supported. Possible shells are: ${SHELL_NAMES.join(
				', '
			)}`
		);
	}
	const shellVersion = getInput('shell-version');
	if (!shellVersion) {
		throw new Error(`"shell-version" input is required.`);
	}
	const shellPath = getInput('shell-path');

	const zipFileName = await downloadShellApp(shellVersion);

	await extractShell(shellName, zipFileName, shellVersion, shellPath);

	const distAppsContents = fs.readdirSync(shellPath);
	console.log(
		`Contents of provided app folder ${shellPath}:`,
		distAppsContents
	);
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});
