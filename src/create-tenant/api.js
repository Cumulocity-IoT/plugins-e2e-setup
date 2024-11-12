// api.js
'use strict';

module.exports = function (host, auth) {
	async function req(path, params = {}) {
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
			const data = text ? JSON.parse(text) : {};

			if (!response.ok) {
				const error = data.error || data.message;
				if (
					error &&
					!error.includes('already has authority') &&
					!error.includes('is already assigned to the tenant')
				) {
					console.error('error in api.js: ' + error);
					console.info('api request:\n', reqObj);
					throw new Error(error);
				}
			}

			return data;
		} catch (err) {
			if (err.name === 'AbortError') {
				throw new Error(`Request timeout after ${params.timeout || 15000}ms`);
			}
			console.log(`error in api.js: ${err.message}`);
			console.info('api request:\n', reqObj);
			throw err;
		}
	}

	return {
		req,
		user: auth.user,
		password: auth.pass
	};
};
