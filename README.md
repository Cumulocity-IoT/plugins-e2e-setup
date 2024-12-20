# plugins-e2e-setup

This repository contains actions that might be utilized for end-to-end tests for the Cumulocity IoT plugins.
Available actions are:

- Collect shell versions
- Get shell app

For example of usage of both action, see [Cumulocity community plugins e2e workflow](https://github.com/SoftwareAG/cumulocity-community-plugins/blob/main/.github/workflows/test-plugins-against-cockpit.yml) section.

## Collect shell versions action

This action will return list of `@c8y/ngx-components` package versions by distribution tag.
By default, it will return last three versions by yearly release dist tags (and `1018-lts` if there are no three yearly releases yet).
Result of this action is a JSON array of objects implementing the following structure:

```ts
{
	tag: string;
	version: string;
}
```

Example output of this action:

```json
[
	{ "tag": "y2025-lts", "version": "1020.0.19" },
	{ "tag": "y2024-lts", "version": "1018.503.100" },
	{ "tag": "1018.0-lts", "version": "1018.0.267" }
]
```

### Usage

Action can be utilized in various purposes.
In this example we run collect-shell-versions action and then use it's output in next step to create a matrix strategy which will result in parallel jobs.
Each job will get an object with dist tag and exact version of the shell app.

```yaml
jobs:
  collect-shell-versions:
    timeout-minutes: 30
    runs-on: ubuntu-22.04
    outputs:
      shell_versions: ${{ steps.collect-shell-versions.outputs.shell_versions }} # declare output variable

    steps:
      - name: Collect Shell Versions
        id: collect-shell-versions
        uses: Cumulocity-IoT/plugins-e2e-setup/collect-shell-versions@main # reference to collect-shell-versions action

      - name: Verify shell versions output
        run: echo "Collected shell versions ${{ steps.collect-shell-versions.outputs.shell_versions }}" # e.g. `echo "Collected shell versions [{"tag":"y2025-lts","version":"1020.0.19"},{"tag":"y2024-lts","version":"1018.503.100"},{"tag":"1018.0-lts","version":"1018.0.267"}]"`

  run-tests-against-shell:
    needs: [collect-shell-versions]
    runs-on: ubuntu-22.04
    strategy:
      matrix:
        version_data: ${{ fromJson(needs.collect-shell-versions.outputs.shell_versions) }} # create matrix strategy based on collect-shell-versions output
    env: # declare environment variables based on matrix strategy
      JSON: ${{ toJson(matrix.version_data) }} # e.g. `{"tag":"y2025-lts","version":"1020.0.19"}`
      VERSION: ${{ matrix.version_data.version }} # e.g. `1020.0.19`

    steps:
```

### Inputs

You can modify returned list with inputs below:

- `include-latest` - boolean; if set to `true` it will include the latest version of the shell app as first element of output (and yearly releases as next elements). Default is `false`. Optional.
- `versions-length` - number; maximum number of versions to include in the output. Default is `3`. Returned list may be shorter if available dist tags are less than provided number. Optional.
- `include-deprecated` - boolean; if set to `true` it will include deprecated versions in the output. Default is `false`. Optional.
- `exact-tags` - string; comma separated list of exact dist tags to include in the output, e.g. "y2024-lts,1018.0-lts". It will override `include-latest` and `versions-length` inputs. Input `include-deprecated` is still applicable along with `exact-tags`. Optional.
- `package-name`- string; name of the package to get versions for. Default is `@c8y/ngx-components`. Optional.

## Get shell apps action

This action downloads shell app of given version and unzips it to provided destination path.

### Usage

Action can be utilized for e2e testing purposes. In this example we get Cockpit app and use it to test plugins against Cockpit shell.
Cockpit of version 1020.0.19 will be downloaded and unzipped to to `dist/apps/cockpit`.

```yaml
jobs:
  run-tests-against-shell:
  runs-on: ubuntu-22.04

  steps:
    # Omitting not relevant steps

    - name: Download build artifact
      uses: actions/download-artifact@v4
      with:
        name: build
        path: dist/apps/sag-pkg-community-plugins/

    - name: Get shell app of particular version
      uses: Cumulocity-IoT/plugins-e2e-setup/get-shell-app@main # reference to get-shell-app action
      with:
        shell-name: cockpit
        shell-version: 1020.0.19
        shell-path: dist/apps

    - name: Cypress run
      uses: cypress-io/github-action@v5
      with:
        start: npm run cypress:ctrl # using cumulocity-cypress-control package to host dist folder
        install: false
        wait-on: 'http://localhost:4200/apps/cockpit/index.html?remotes=%7B"sag-pkg-community-plugins"%3A%5B"ExampleWidgetPluginModule"%2C"DatapointsGraphWidgetModule"%5D%7D#'
        browser: chrome
        config-file: cypress.config.ts
```

### Inputs

You can modify action's behavior with inputs below:

- `shell-name` - string; name of the shell app to download. Possible shells are `cockpit`, `devicemanagement` and `administration`. Required.
- `shell-version` - string; exact version of shell app. E.g. `1020.0.19`. Required.
- `shell-path` - string; path where shell app should be unzipped. Default is `dist/apps`. Ultimately shell app will be extracted to path `<shell-path>/<shell-name>`, e.g. for `shell-path`: `dist/apps` and `shell-name`: `cockpit`, shell will be extracted to `dist/apps/cockpit`. Optional.

## Create tenant action

This action creates a tenant with given name and user with given credentials.

### Usage

Action can be utilized for e2e testing purposes. Management tenant credentials are necessary for this job.

```yaml
jobs:
  create-tenant:
    needs: [setup-env]
    timeout-minutes: 30
    runs-on: c8y-ui-cicd-docker
    environment:
      name: "latest-stage"
    outputs:
      domain-prefix: ${{ steps.create-domain-prefix.outputs.domain-prefix }}
      tenant-id: ${{ steps.create-tenant.outputs.tenant-id }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Create domain prefix
        id: create-domain-prefix
        run: echo "domain-prefix=uic8y-cy-${{ github.run_id }}-${{ github.run_attempt }}" >> $GITHUB_OUTPUT

      - name: Create tenant
        id: create-tenant
        uses: Cumulocity-IoT/plugins-e2e-setup/create-tenant@main
        with:
          cy-domain-prefix: ${{ steps.create-domain-prefix.outputs.domain-prefix }}
          cy-user: "admin"
          cy-password: "Test123"
          cy-email: "test@test.com"
          cy-management-user: "tenantadmin"
          cy-management-password: "Test1234"
          cy-management-url: "https://management.latest.stage.io/"
          apps-to-subscribe: "user-notification,user-notification-w,user-notification-ui-plugin"
```

### Inputs

You can modify action's behavior with inputs below:

- `cy-domain-prefix: string`: domain prefix of the tenant. Required. Tenant will be later accessible under `https://<cy-domain-prefix>.latest.stage.io`.
- `cy-user`: string; user name of the tenant. Optional, default value: "admin".
- `cy-password`: string; password of the tenant. Required.
- `cy-email`: string; email of the tenant. Optional, default value: "test@test.com"
- `cy-management-user`: string; user name of the tenant management user. Required.
- `cy-management-password`: string; password of the tenant management user. Required.
- `cy-management-url`: string; URL of the tenant management. Required.
- `apps-to-subscribe`: string; comma separated list of apps to subscribe. Optional. 

## Delete tenant action

This action deletes a tenant with url.

### Usage

Action can be utilized for e2e testing purposes. Management tenant credentials are necessary for this job.

```yaml
jobs:
  delete-tenant:
  needs: [create-tenant, setup-env, run-cypress-tests]
  timeout-minutes: 30
  runs-on: c8y-ui-cicd-docker
  environment:
    name: "latest-stage"

  steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        fetch-depth: 1

    - name: Use Node.js ${{ env.NODE_VERSION }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}

    - name: Delete tenant
      id: delete-tenant
      uses: Cumulocity-IoT/plugins-e2e-setup/delete-tenant@main
      with:
        cy-url: https://uic8y-cy-11798575014-1.latest.stage.io/
        cy-management-user: ${{ secrets.USER }}
        cy-management-password: ${{ secrets.PASSWORD }}
        cy-company: uic8y-cy-${{ github.run_id }}
```

### Inputs

You can modify action's behavior with inputs below:
- `cy-url`: string; URL of the tenant. Required.
- `cy-management-user`: string; name of the tenant management user. Required.
- `cy-management-password`: string; password of the tenant management user. Required.
- `cy-company`: string; company name of the tenant. Required.

## Features as scripts

`collect-shell-versions`, `get-shell-app` and `create-tenant` can be used as scripts from folder `dist/scripts/collect-shell-versions/index.js` and `dist/scripts/get-shell-app/index.js` respectively.
For example, to run `get-shell-app` script you can add wrapper script that require `dist/scripts/get-shell-app/index.js`, get parameters from command line and run the script.

```test.js
const { getShellApp } = require('<path>/index');

async function testGetShellApp(shellName, shellVersion, shellPath) {
        await getShellApp({
            shellName,
            shellVersion,
            shellPath
        });
}
const [shellName, shellVersion, shellPath] = process.argv.slice(2);

testGetShellApp(shellName, shellVersion, shellPath);
```

Run the script from console

```bash
node <path>/test.js cockpit 1020.2.12 ./test-path
```

In result, cockpit app will be downloaded and unzipped to `./test-path/cockpit` folder.
