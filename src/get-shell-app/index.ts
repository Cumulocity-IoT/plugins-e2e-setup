import { getInput, setFailed } from '@actions/core';
import { downloadShellApp } from './download-shell-app';
import { extractShell } from './extract-shell';
import fs from 'fs';
import path from 'path';

const SHELL_NAMES = ['cockpit', 'devicemanagement', 'administration'];

/**
 * This action downloads the shell app, extracts it to dist/apps folder.
 */
const performAction = async () => {
	const shellName = getInput('shell-name');
	if (!SHELL_NAMES.includes(shellName)) {
		throw new Error(
			`Shell "${shellName}" is not supported. Possible shells are: ${SHELL_NAMES.join(
				', '
			)}`
		);
	}
	const shellVersion = getInput('shell-version');
	console.log(`Shell version is: ${shellVersion}`);

	const fileUrl = `http://resources.cumulocity.com/webapps/ui-releases/apps-${shellVersion}.tgz`;
	console.log(`Shell file url is: ${fileUrl}`);

	const zipFileName = await downloadShellApp(shellVersion, fileUrl);

	await extractShell(shellName, zipFileName, shellVersion);

	const distAppsContents = fs.readdirSync(path.join('dist', 'apps'));
	console.log('Contents of dist/apps:', distAppsContents);
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});
