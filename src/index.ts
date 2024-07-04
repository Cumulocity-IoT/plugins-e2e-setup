const github = require("@actions/github");
import { collectShellVersions } from "./collect-shell-versions";
import { setFailed, setOutput, getInput } from "@actions/core";

const performAction = async () => {
    // `who-to-greet` input defined in action metadata file
    const nameToGreet = getInput("who-to-greet");
    console.log(`Hello ${nameToGreet}!`);
    const time = new Date().toTimeString();
    setOutput("time", time);
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The event payload: ${payload}`);

    await collectShellVersions();

};

performAction().catch((error) => {
  console.error("An error occurred", error);
  setFailed(error.message);
});
