import * as fs from 'fs';
import axios from 'axios';

type ZippedFileName = string;

/**
 * Downloads the shell app from the given file URL and returns downloaded file name.
 * @param shellVersion The shell version to download.
 * @param fileUrl The URL of the file to download.
 * @returns The name of the downloaded file.
 */
export async function downloadShellApp(
	shellVersion: string,
	fileUrl: string
): Promise<ZippedFileName> {
	try {
		const tgzFile = `apps-${shellVersion}.tgz`;
		await downloadFile(fileUrl, tgzFile);
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
 * @param url The URL of the file to download.
 * @param outputPath The path to save the downloaded file.
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
	const writer = fs.createWriteStream(outputPath);

	const response = await axios({
		url,
		method: 'GET',
		responseType: 'stream'
	});

	response.data.pipe(writer);

	return new Promise((resolve, reject) => {
		writer.on('finish', resolve);
		writer.on('error', reject);
	});
}
