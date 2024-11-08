import request from 'request-promise';

interface C8yApiConfig {
	user: string;
	pass: string;
	sendImmediately?: boolean;
}

export class C8yApi {
	private baseUrl: string;
	private auth: C8yApiConfig;

	constructor(baseUrl: string, auth: C8yApiConfig) {
		this.baseUrl = baseUrl;
		this.auth = auth;
	}

	async req(path: string, options: any = {}): Promise<any> {
		const url = `${this.baseUrl}${path}`;
		const defaultOptions = {
			auth: this.auth,
			method: 'GET',
			headers: {
				'content-type': 'application/json'
			},
			json: true
		};

		const requestOptions = { ...defaultOptions, ...options, url };
		return request(requestOptions);
	}
}

export default function (baseUrl: string, auth: C8yApiConfig): C8yApi {
	return new C8yApi(baseUrl, auth);
}
