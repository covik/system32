import { getStack } from '@pulumi/pulumi';
import { findStackResources } from './src/stacks';

const resources = findStackResources(getStack());
module.exports = resources();
