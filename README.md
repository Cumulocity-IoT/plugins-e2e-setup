# plugins-e2e-setup

This repository contains actions that might be utilized for end-to-end tests for the Cumulocity IoT plugins.
Available actions are:

- Collect shell versions
- Get shell app

## Collect shell versions

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
Each job will get an object with dist tag, exact version and major version of the shell app.

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

- `include-latest` - boolean; if set to `true` it will include the latest version of the shell app as first element of output (and yearly releases as next elements). Default is `false`.
- `exact-tags` - string; comma separated list of exact dist tags to include in the output, e.g. "y2024-lts,1018.0-lts".
- `versions-length` - number; maximum number of versions to include in the output. Default is `3`. Returned list may be shorter if available dist tags are less than provided number.
- `include-deprecated` - boolean; if set to `true` it will include deprecated versions in the output. Default is `false`.

[//]: # 'TODO: add inputs'
[//]: # 'TODO: document get-shell-app action'
