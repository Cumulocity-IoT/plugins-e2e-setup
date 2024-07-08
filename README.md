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
	major: string;
}
```

Example output of this action:

```json
[
	{ "tag": "y2025-lts", "version": "1020.0.19", "major": "1020" },
	{ "tag": "y2024-lts", "version": "1018.503.100", "major": "1018" },
	{ "tag": "1018.0-lts", "version": "1018.0.267", "major": "1018" }
]
```

### Usage

Action can be utilized in various purposes.
In this example we run collect-shell-versions action and then use it's output in next step to create a matrix strategy which will result in parallel jobs.
Each job will get an object with dist tag, exact version and major version of the shell app. Major version is useful for environment variables that are shared between steps, e.g. for e2e tests versioning.

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
        uses: SoftwareAG/plugins-e2e-setup/collect-shell-versions@main # reference to collect-shell-versions action

      - name: Verify shell versions output
        run: echo "Collected shell versions ${{ steps.collect-shell-versions.outputs.shell_versions }}" # e.g. `echo "Collected shell versions [{"tag":"y2025-lts","version":"1020.0.19","major":"1020"},{"tag":"y2024-lts","version":"1018.503.100","major":"1018"},{"tag":"1018.0-lts","version":"1018.0.267","major":"1018"}]"`

  run-tests-against-shell:
    needs: [collect-shell-versions]
    runs-on: ubuntu-22.04
    strategy:
      matrix:
        version_data: ${{ fromJson(needs.collect-shell-versions.outputs.shell_versions) }} # create matrix strategy based on collect-shell-versions output
    env: # declare environment variables based on matrix strategy
      JSON: ${{ toJson(matrix.version_data) }} # e.g. `{"tag":"y2025-lts","version":"1020.0.19","major":"1020"}`
      VERSION: ${{ matrix.version_data.version }} # e.g. `1020.0.19`
      MAJOR: ${{ matrix.version_data.major }} # e.g. `1020`

    steps:
```

### Inputs

You can modify returned list with inputs below:

- `include-latest` - boolean; if set to `true` it will include the latest version of the shell app as first element of output (and yearly releases as next elements). Default is `false`. Optional.
- `versions-length` - number; maximum number of versions to include in the output. Default is `3`. Returned list may be shorter if available dist tags are less than provided number. Optional.
- `include-deprecated` - boolean; if set to `true` it will include deprecated versions in the output. Default is `false`. Optional.
- `exact-tags` - string; comma separated list of exact dist tags to include in the output, e.g. "y2024-lts,1018.0-lts". It will override `include-latest` and `versions-length` inputs. Input `include-deprecated` is still applicable along with `exact-tags`. Optional.

## Get shell apps action

This action downloads shell app of given version and unzips it to provided destination path.

### Usage

Action can be utilized for e2e testing purposes. In this example we get Cockpit app and use it to test plugins against Cockpit shell.

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
      uses: SoftwareAG/plugins-e2e-setup/get-shell-app@main # reference to get-shell-app action
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
- `shell-path` - string; path where shell app should be unzipped. Default is `dist/apps`. Optional.
