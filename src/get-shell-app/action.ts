import { getInput, setFailed } from '@actions/core';
import { getShellApp } from './index';

/**
 * This action downloads the shell app, extracts it to dist/apps folder.
 */
const performAction = async () => {
	const shellName = getInput('shell-name');
	const shellVersion = getInput('shell-version');
	const shellPath = getInput('shell-path');

	await getShellApp({ shellName, shellVersion, shellPath });
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});
