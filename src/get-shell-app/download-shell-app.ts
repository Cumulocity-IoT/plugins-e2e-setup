import * as fs from 'fs';
import axios from 'axios';

type ZippedFileName = string;

/**
 * Downloads the shell app from the given file URL and returns downloaded file name.
 * @param shellVersion The shell version to download.
 * @returns The name of the downloaded file.
 */
export async function downloadShellApp(
	shellVersion: string
): Promise<ZippedFileName> {
	const fileUrl = buildResourcesUrl(shellVersion);
	const fallbackFileUrl = buildResourcesUrl(shellVersion, true);
	console.log(`Shell file url is: ${fileUrl}`); // TODO: debug only, to remove
	console.log(`Shell file fallback url is: ${fallbackFileUrl}`); // TODO: debug only, to remove

	try {
		const tgzFile = `apps-${shellVersion}.tgz`;
		await downloadFile(fileUrl, fallbackFileUrl, tgzFile);
		if (!fs.existsSync(tgzFile)) {
			throw new Error('Downloaded file not found!');
		}
		console.log('File downloaded successfully.');
		return tgzFile;
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}

/**
 * Downloads the file from the given URL and saves it to the given output path.
 * If the download from the first URL fails, it attempts to download from the fallback URL.
 * @param url The URL of the file to download.
 * @param fallbackUrl The fallback URL of the file to download.
 * @param outputPath The path to save the downloaded file.
 */
async function downloadFile(
	url: string,
	fallbackUrl: string,
	outputPath: string
): Promise<void> {
	const writer = fs.createWriteStream(outputPath);

	try {
		const response = await axios({
			url,
			method: 'GET',
			responseType: 'stream'
		});

		response.data.pipe(writer);

		await new Promise((resolve, reject) => {
			writer.on('finish', resolve);
			writer.on('error', reject);
		});
	} catch (_) {
		console.error(
			`Failed to download from ${url}. Attempting fallback URL ${fallbackUrl}`
		);
		const writerFallback = fs.createWriteStream(outputPath);

		const responseFallback = await axios({
			url: fallbackUrl,
			method: 'GET',
			responseType: 'stream'
		});

		responseFallback.data.pipe(writerFallback);

		await new Promise((resolve, reject) => {
			writerFallback.on('finish', resolve);
			writerFallback.on('error', reject);
		});
	}
}

function buildResourcesUrl(shellVersion: string, fallback?: boolean): string {
	const p = ['h', 't', 't', 'p'].join('') + '://';
	const d = [
		fallback ? 'staging-resources' : 'resources',
		'cumulocity',
		'com'
	].join('.');
	const path = ['', 'webapps', 'ui-releases', ''].join('/');
	const file = ['apps', shellVersion].join('-') + '.tgz';
	return p + d + path + file;
}
