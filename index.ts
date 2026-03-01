import { getStack } from "@pulumi/pulumi";
import { findStackResources } from "./src/stacks/index.js";

const resources = findStackResources(getStack());

export default resources();
