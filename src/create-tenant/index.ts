import _ from 'lodash';
import { ApiClient, createApiClient } from './api';

function sleep(n: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, n * 1000));
}

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

let applicationsToBeSubscribed: string[] = [
	'actility',
	'apama-ctrl-smartrulesmt',
	'cloud-remote-access',
	'connectivity-agent-server',
	'feature-branding',
	'feature-broker',
	'databroker-agent-server',
	'feature-fieldbus4',
	'feature-opcua-legacy',
	'feature-user-hierarchy',
	'loriot-agent',
	'lwm2m-agent',
	'opcua-mgmt-service',
	'sigfox-agent',
	'smartrule',
	'snmp-mib-parser',
	'sslmanagement'
];

interface CreateTenantParams {
	tenantName: string;
	managementUrl: string;
	user: string;
	password: string;
	email?: string;
	managementUser: string;
	managementPassword: string;
	isManagement?: boolean;
	noTenantSuffix?: boolean;
	companyName?: string;
	contactName?: string;
	numberOfTenants?: number;
	appsToSubscribe?: string;
}

interface TenantResponse {
	id: string;
}

interface Application {
	owner: {
		tenant: {
			id: string;
		};
	};
	name: string;
	id: string;
}

interface RoleResponse {
	roles: Array<{
		id: string;
	}>;
}

interface GroupResponse {
	groups: Array<{
		name: string;
		id: string;
	}>;
}

async function createTenant({
	tenantName,
	managementUrl,
	user,
	password,
	email,
	managementUser,
	managementPassword,
	appsToSubscribe,
	isManagement = true,
	noTenantSuffix = false,
	companyName = 'e2eTesting tenant',
	contactName = 'Mr. Smith',
	numberOfTenants = 1
}: CreateTenantParams): Promise<string> {
	if (appsToSubscribe) {
		applicationsToBeSubscribed = appsToSubscribe.split(',');
	}
	if (!managementUrl || !managementUser || !managementPassword || !tenantName) {
		throw new Error('Required parameters are missing');
	}

	const domainMatch = managementUrl.match(/\.([a-z0-9.-]*)/);
	if (!domainMatch) {
		throw new Error('Invalid management URL');
	}
	const domain = domainMatch[1];

	const c8yapi: ApiClient = createApiClient(managementUrl, {
		user: managementUser,
		pass: managementPassword
	});

	const createTenants = async (tenantNumber: number): Promise<string[]> => {
		const url = '/tenant/tenants';
		const tenantIds: string[] = [];

		for (let index = 0; index < tenantNumber; index++) {
			try {
				const body = {
					company: companyName,
					contactName: contactName,
					contactPhone: '+48123456789',
					domain: `${tenantName}${
						noTenantSuffix === false ? index + 1 : ''
					}.${domain}`,
					adminName: user,
					adminPass: password,
					adminEmail: email
				};

				const response = await c8yapi.req<TenantResponse>(url, {
					method: 'POST',
					body,
					timeout: 300000,
					headers: { Accept: 'application/json' }
				});

				if (response && response.id) {
					console.log(`Tenant created with ID: ${response.id}`);
					tenantIds.push(response.id);
				} else {
					throw new Error('No tenant ID in response');
				}
			} catch (error) {
				console.error(`Failed to create tenant ${index + 1}:`, error);
				throw error;
			}
		}

		if (isManagement) {
			await updateTenants(tenantIds);
		}

		return tenantIds;
	};

	const updateTenants = async (tenantIds: string[]): Promise<void> => {
		for (const tenantId of tenantIds) {
			try {
				const url = `/tenant/tenants/${tenantId}`;
				await c8yapi.req(url, {
					method: 'PUT',
					body: {
						allowCreateTenants: true,
						customProperties: {
							gainsightEnabled: true
						}
					},
					timeout: 120000
				});
			} catch (error) {
				console.error(`Failed to update tenant ${tenantId}:`, error);
				throw error;
			}
		}
	};

	const getApplicationCollection = async (): Promise<Application[]> => {
		const url =
			'/application/applicationsByOwner/management?pageSize=1000&withTotalPages=true';
		const resp = await c8yapi.req<{ applications: Application[] }>(url);
		return resp.applications.map(elem => _.pick(elem, ['owner', 'name', 'id']));
	};

	const getListOfPermissions = async (tenantId: string): Promise<string[]> => {
		const url = '/user/roles?pageSize=100&withTotalPages=true';
		const res = await c8yapi.req<RoleResponse>(url, {
			headers: {
				Authorization: `Basic ${Buffer.from(
					`${tenantId}/${user}:${password}`
				).toString('base64')}`
			}
		});
		return res.roles.map(elem => elem.id);
	};

	const getAdminRoleId = async (tenantId: string): Promise<string> => {
		const url = `/user/${tenantId}/groups?pageSize=100&withTotalPages=true`;
		const resp = await c8yapi.req<GroupResponse>(url, {
			headers: {
				Authorization: `Basic ${Buffer.from(
					`${tenantId}/${user}:${password}`
				).toString('base64')}`
			}
		});
		const adminGroup = _.find(resp.groups, { name: 'admins' });
		if (!adminGroup) throw new Error('Admin group not found');
		return adminGroup.id;
	};

	const addPermissionsToRole = async (tenantId: string): Promise<void> => {
		try {
			const roleId = await getAdminRoleId(tenantId);
			const permissionsList = await getListOfPermissions(tenantId);

			for (const permission of permissionsList) {
				try {
					const url = `/user/${tenantId}/groups/${roleId}/roles`;
					await c8yapi.req(url, {
						method: 'POST',
						headers: {
							Authorization: `Basic ${Buffer.from(
								`${tenantId}/${user}:${password}`
							).toString('base64')}`,
							'Content-Type':
								'application/vnd.com.nsn.cumulocity.roleReference+json'
						},
						body: {
							role: {
								id: permission,
								name: permission,
								self: `https://${tenantId}.${domain}/user/roles/${permission}`
							}
						}
					});
				} catch (error: any) {
					if (error.status === 409) {
						console.log(
							`Permission ${permission} already exists for tenant ${tenantId}, skipping...`
						);
						continue;
					}
					throw error;
				}
			}
		} catch (error) {
			console.error(`Failed to add permissions for tenant ${tenantId}:`, error);
			throw error;
		}
	};

	const findSubscriptionsIds = async (): Promise<string[]> => {
		const apps = await getApplicationCollection();
		return apps
			.filter(
				app =>
					applicationsToBeSubscribed.includes(app.name) &&
					app.owner.tenant.id === 'management'
			)
			.map(app => app.id);
	};

	const subscribeMicroservice = async (
		idsToSubscribe: string[],
		tenantId: string
	): Promise<void> => {
		for (const id of idsToSubscribe) {
			try {
				const url = `/tenant/tenants/${tenantId}/applications`;
				await c8yapi.req(url, {
					method: 'POST',
					headers: {
						Authorization: `Basic ${Buffer.from(
							`${managementUser}:${managementPassword}`
						).toString('base64')}`
					},
					body: {
						application: {
							id: `${id}`
						}
					},
					timeout: 150000
				});
			} catch (error: any) {
				if (error.status === 409) {
					console.log(
						`Microservice ${id} already subscribed for tenant ${tenantId}, skipping...`
					);
					continue;
				}
				console.error(
					`Failed to subscribe microservice ${id} for tenant ${tenantId}:`,
					error
				);
				throw error;
			}
		}
	};

	try {
		const tenantIds = await createTenants(numberOfTenants);

		if (
			!_.includes(tenantIds, undefined) &&
			tenantIds.length === numberOfTenants
		) {
			for (const tenantId of tenantIds) {
				const idsToSubscribe = await findSubscriptionsIds();
				await subscribeMicroservice(idsToSubscribe, tenantId);
				await sleep(11);
				await addPermissionsToRole(tenantId);
			}
			return tenantIds[0];
		} else {
			throw new Error('Some or all of the tenant creation failed!');
		}
	} catch (ex) {
		console.error('Creation process failed:', ex);
		throw ex;
	}
}

export { createTenant };
