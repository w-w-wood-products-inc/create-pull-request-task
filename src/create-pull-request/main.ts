import * as axios from "axios";
import * as tl from "azure-pipelines-task-lib/task";

function printFormatedHeader(text: string) {
        console.log(
`

********************************************************************
* ${text}
********************************************************************

`);
}

function printVariable(variable: any, description: string) {
    console.log(`${description}: ${variable}`);
}

function handleError(failMessage: string, err?: Error) {
    if (err !== undefined) {
        console.error(err);
    }
    tl.setResult(tl.TaskResult.Failed, failMessage);
}

function voteOnPullRequest(
        axiosInstance: axios.AxiosInstance,
        organization: string,
        project: string,
        repoID: string,
        pullRequestId: number,
        createdBy: any) {
    printFormatedHeader("Calling DevOps API to Vote on Pull Request");
    const voteEndpoint = `${organization}/${project}/_apis/git/repositories/${repoID}/pullRequests/${pullRequestId}/reviewers/${createdBy.id}?api-version=5.1`;
    const body = {
        vote: 10
    };
    axiosInstance.put(voteEndpoint, body).then((res) => {
        printVariable(`${res.status} ${res.statusText}`, "Status Code");
        console.log(res.data);
    }).catch((err) =>
        handleError("Failed to create pull request. See HTTP Error for more info.", err)
    );
}

function setAutoCompleteOnPullRequest(
        axiosInstance: axios.AxiosInstance,
        organization: string,
        project: string,
        repoID: string,
        pullRequestId: number,
        createdBy: any) {
    printFormatedHeader("Calling DevOps API to set auto-complete");
    printVariable(pullRequestId, "Pull Request ID");
    printVariable(createdBy.displayName, "Created By");
    // VOTE On Pull Request to auto-approve and merge it
    const approveEndPoint = `${organization}/${project}/_apis/git/repositories/${repoID}/pullrequests/${pullRequestId}?api-version=7.0`;
    const approveBody = {
        AutoCompleteSetBy: {
            Id: createdBy.id
        },
    };
    axiosInstance.patch(approveEndPoint, approveBody).then((res) => {
        printVariable(`${res.status} ${res.statusText}`, "Status Code");
        console.log(res.data);
        voteOnPullRequest(axiosInstance, organization, project, repoID, pullRequestId, createdBy);
    }).catch((err) =>
        handleError("Failed to create pull request. See HTTP Error for more info.", err)
    );
}

async function run() {
    try {
        printFormatedHeader("CREATE PULL REQUEST");
        const pat: string | undefined = tl.getInput("patstring", true);
        const sourceBranch: string | undefined = tl.getInput("sourcebranchstring", true);
        const destinationBranch: string | undefined = tl.getInput("destinationbranchstring", true);
        const autoApprove: boolean | undefined = tl.getBoolInput("autoapproveboolean", true);

        if (sourceBranch === "bad"
         || destinationBranch === "bad"
         || pat === "bad"
         || autoApprove === undefined) {
            tl.setResult(tl.TaskResult.Failed, "Bad input was given");
            return;
        }
        printVariable(sourceBranch, "Source Branch");
        printVariable(destinationBranch, "Destination Branch");
        printVariable(autoApprove, "Auto Approve");

        const teamFoundationCollectionUri = tl.getVariable("System.TeamFoundationCollectionUri");
        const project = tl.getVariable("System.TeamProject");
        const repoID = tl.getVariable("Build.Repository.ID");

        if (repoID === undefined) {
            handleError("No repository ID was available");
            return;
        }
        else if (project === undefined) {
            handleError("No project name was available");
            return;
        }
        else if (teamFoundationCollectionUri === undefined) {
            handleError("No TeamFoundationCollectionUri was available");
            return;
        }
        else {
            printVariable(teamFoundationCollectionUri, "DevOps Organization");
            printVariable(project, "Project");
            printVariable(repoID, "Repository ID");

            printFormatedHeader("Calling DevOps REST API to Create PR");
            const organization = teamFoundationCollectionUri.replace("https://", "").split(".")[0];

            const baseUrl = "https://dev.azure.com/";
            const apiEndpoint = `${organization}/${project}/_apis/git/repositories/${repoID}/pullrequests?api-version=7.0`;

            printVariable(baseUrl, "API Base Url");
            printVariable(`${baseUrl}${apiEndpoint}`, "API Endpoint");

            const encodedPat = Buffer.from("`:" + pat).toString("base64");

            const axiosInstance = axios.default.create({
                    baseURL: baseUrl,
                    timeout: 1000,
                    headers: {Authorization: `Basic ${encodedPat}`}
                });

            const body = {
                        sourceRefName: `${sourceBranch}`,
                        targetRefName: `${destinationBranch}`,
                        title: `Merge ${sourceBranch} into ${destinationBranch}`,
                        description: "This pull request was generated from the Create Pull Request release pipeline task.",
                    };

            axiosInstance.post(apiEndpoint, body)
                .then(result => {
                    printVariable(`${result.status} ${result.statusText}`, "Status Code");
                    console.log(result.data);
                    if (autoApprove) {
                        setAutoCompleteOnPullRequest(
                            axiosInstance,
                            organization,
                            project,
                            repoID,
                            result.data.pullRequestId,
                            result.data.createdBy);
                    }
                }).catch((err) =>
                    handleError("Failed to create pull request. See HTTP Error for more info.", err)
                );
        }

    }
        catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
