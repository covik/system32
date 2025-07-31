import { getStack } from '@pulumi/pulumi';
import { findStackResources } from './src/stacks/index.js';

const resources = findStackResources(getStack());

// eslint-disable-next-line import/no-default-export
export default resources();
