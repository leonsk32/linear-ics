import { App, CfnOutput, Duration, RemovalPolicy, Stack, Tags } from 'aws-cdk-lib';
import { FunctionUrlAuthType, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

const { LINEAR_API_KEY, FEED_TOKEN, OWNER } = process.env;
if (!LINEAR_API_KEY || !FEED_TOKEN) throw new Error('LINEAR_API_KEY and FEED_TOKEN are required');

const app = new App();
const stack = new Stack(app, 'LinearIcs');
if (OWNER) Tags.of(app).add('owner', OWNER);

// ponytail: secrets in Lambda env vars (visible in the console), move to Secrets Manager if the account is shared
const fn = new NodejsFunction(stack, 'Feed', {
  entry: 'src/handler.ts',
  runtime: Runtime.NODEJS_24_X,
  timeout: Duration.seconds(15),
  environment: { LINEAR_API_KEY, FEED_TOKEN },
  // Own the log group so it gets the owner tag; the auto-created one is untagged
  logGroup: new LogGroup(stack, 'FeedLogs', { retention: RetentionDays.ONE_MONTH, removalPolicy: RemovalPolicy.DESTROY }),
});
const url = fn.addFunctionUrl({ authType: FunctionUrlAuthType.NONE });

new CfnOutput(stack, 'SubscribeUrl', { value: `${url.url}?token=${FEED_TOKEN}` });
