import { downloadShellApp } from './download-shell-app';
import { extractShell } from './extract-shell';
import fs from 'fs';

const SHELL_NAMES = ['cockpit', 'devicemanagement', 'administration'];

type GetShellAppParams = {
	shellName: string;
	shellVersion: string;
	shellPath: string;
};

export async function getShellApp({
	shellName,
	shellVersion,
	shellPath
}: GetShellAppParams) {
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
	if (!shellVersion) {
		throw new Error(`"shell-version" input is required.`);
	}

	const zipFileName = await downloadShellApp(shellVersion);

	await extractShell(shellName, zipFileName, shellVersion, shellPath);

	const distAppsContents = fs.readdirSync(shellPath);
	console.log(
		`Contents of provided app folder ${shellPath}:`,
		distAppsContents
	);
}
