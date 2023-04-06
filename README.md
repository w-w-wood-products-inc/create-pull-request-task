# Create Pull Request Pipeline Task

## How to build/test

Set the following environment variables
powershell:
```powershell
$env:INPUT_SOURCEBRANCHSTRING="refs/heads/my-test-source-branch"
$env:INPUT_DESTINATIONBRANCHSTRING="refs/heads/my-test-destination-branch"
$env:INPUT_AUTOAPPROVEBOOLEAN="true"
$env:INPUT_PATSTRING="yourpersonalaccesstoken"

$env:System_TeamFoundationCollectionUri="https://yourorganization.visualstudio.com/"
$env:System_TeamProject="ProjectName"
# GUID of the repo you are making the pull request in
$env:Build_Repository_ID="some-guid"
```

Build and run the code

```powershell
yarn
yarn build
node .\dist\create-pull-request\main.js
```

Build vsix package to deploy

```powershell
yarn build:package
```