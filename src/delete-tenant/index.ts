import { setTimeout } from 'timers/promises';

interface TenantConfig {
	url: string;
	managementUser: string;
	managementPassword: string;
	companyName: string;
}

interface Tenant {
	id: string;
	company: string;
	creationTime: string;
}

interface TenantsResponse {
	tenants: Tenant[];
}

const sleep = async (seconds: number): Promise<void> => {
	await setTimeout(seconds * 1000);
};

export async function deleteTenant(config: TenantConfig): Promise<void> {
	// Disable SSL verification (not recommended for production)
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

	const auth = Buffer.from(
		`management/${config.managementUser}:${config.managementPassword}`
	).toString('base64');

	try {
		// Fetch tenants
		const response = await fetch(
			`${config.url}/tenant/tenants?pageSize=1000&withApps=false`,
			{
				method: 'GET',
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json'
				}
			}
		);

		if (!response.ok) {
			throw new Error(
				`Failed to retrieve subtenants. Status: ${response.status}`
			);
		}

		const data = (await response.json()) as TenantsResponse;
		const tenants = data.tenants;

		// Filter tenants by company name
		const filteredTenants = tenants.filter(t =>
			t.company.includes(config.companyName)
		);

		// Delete each filtered tenant
		for (const tenant of filteredTenants) {
			try {
				const deleteResponse = await fetch(
					`${config.url}/tenant/tenants/${tenant.id}`,
					{
						method: 'DELETE',
						headers: {
							Authorization: `Basic ${auth}`,
							'Content-Type': 'application/json'
						}
					}
				);

				if (deleteResponse.status === 204) {
					console.log(`Deleted tenant with id ${tenant.id}`);
				} else {
					console.warn(
						`Failed to delete tenant with id ${tenant.id}, returned with status: ${deleteResponse.status}`
					);
				}

				// Wait 500ms between requests
				await sleep(0.5);
			} catch (error) {
				console.error(`Error deleting tenant ${tenant.id}:`, error);
			}
		}
	} catch (error) {
		console.error('Error in deleteTenant:', error);
		throw error;
	}
}
