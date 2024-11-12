interface Auth {
	user: string;
	pass: string;
}

interface RequestParams {
	method?: string;
	headers?: Record<string, string>;
	body?: any;
	timeout?: number;
}

export interface ApiClient {
	req: <T = any>(path: string, params?: RequestParams) => Promise<T>;
	user: string;
	password: string;
}

export function createApiClient(host: string, auth: Auth): ApiClient {
	async function req<T>(path: string, params: RequestParams = {}): Promise<T> {
		const reqObj = {
			method: 'GET',
			...params,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${Buffer.from(
					`${auth.user}:${auth.pass}`
				).toString('base64')}`,
				...(params.headers || {})
			}
		};

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(
				() => controller.abort(),
				params.timeout || 15000
			);

			const response = await fetch(host + path, {
				...reqObj,
				body:
					reqObj.method !== 'GET' && reqObj.body
						? JSON.stringify(reqObj.body)
						: undefined,
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			// Check if response is empty
			const text = await response.text();
			const data: T = text ? JSON.parse(text) : {};

			if (!response.ok) {
				const error = (data as any).error || (data as any).message;
				if (
					error &&
					!error.includes('already has authority') &&
					!error.includes('is already assigned to the tenant')
				) {
					console.error('error in api.ts: ' + error);
					console.info('api request:\n', reqObj);

					// Include status code in error
					const errorWithStatus = new Error(error);
					(errorWithStatus as any).status = response.status;
					throw errorWithStatus;
				}
			}

			return data;
		} catch (err: any) {
			if (err.name === 'AbortError') {
				throw new Error(`Request timeout after ${params.timeout || 15000}ms`);
			}
			console.log(`error in api.ts: ${err.message}`);
			console.info('api request:\n', reqObj);
			throw err;
		}
	}

	return {
		req,
		user: auth.user,
		password: auth.pass
	};
}
