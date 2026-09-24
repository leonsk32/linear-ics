import { App, CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { FunctionUrlAuthType, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

const { LINEAR_API_KEY, FEED_TOKEN } = process.env;
if (!LINEAR_API_KEY || !FEED_TOKEN) throw new Error('LINEAR_API_KEY and FEED_TOKEN are required');

const app = new App();
const stack = new Stack(app, 'LinearIcs');

// ponytail: secrets in Lambda env vars (visible in the console), move to Secrets Manager if the account is shared
const fn = new NodejsFunction(stack, 'Feed', {
  entry: 'src/handler.ts',
  runtime: Runtime.NODEJS_24_X,
  timeout: Duration.seconds(15),
  environment: { LINEAR_API_KEY, FEED_TOKEN },
});
const url = fn.addFunctionUrl({ authType: FunctionUrlAuthType.NONE });

new CfnOutput(stack, 'SubscribeUrl', { value: `${url.url}?token=${FEED_TOKEN}` });
