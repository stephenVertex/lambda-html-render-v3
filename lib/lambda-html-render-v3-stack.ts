import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';

export class LambdaHtmlRenderV3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an S3 bucket for storing screenshots
    const screenshotBucket = new s3.Bucket(this, 'ScreenshotBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only, use RETAIN for production
      autoDeleteObjects: true, // For development only, remove for production
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(7), // Automatically delete screenshots after 7 days
        },
      ],
    });

    // Create the HTML to Image Lambda function
    const htmlToImageFunction = new nodejs.NodejsFunction(this, 'HtmlToImageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X, // Use Node.js 18.x for better compatibility with puppeteer
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/html-to-image.ts'),
      memorySize: 3008, // Chromium needs higher memory
      timeout: cdk.Duration.seconds(60), // Increase timeout for Chromium startup
      description: 'Lambda function that renders HTML to an image using Puppeteer',
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        S3_BUCKET_NAME: screenshotBucket.bucketName
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'], // Use Lambda's built-in AWS SDK
        nodeModules: ['puppeteer-core', '@sparticuz/chromium-min'], // Bundle these dependencies
        format: nodejs.OutputFormat.ESM,
        target: 'node18'
      }
    });

    // Grant the Lambda function permission to write to the S3 bucket
    screenshotBucket.grantReadWrite(htmlToImageFunction);

    // Create an API Gateway REST API
    const api = new apigateway.RestApi(this, 'HtmlToImageApi', {
      restApiName: 'HTML to Image API',
      description: 'API Gateway endpoint for the HTML to Image Lambda function',
      deployOptions: {
        stageName: 'prod',
        // Disable metrics and logging to avoid the CloudWatch Logs role requirement
        metricsEnabled: false,
        loggingLevel: apigateway.MethodLoggingLevel.OFF,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Create a resource and method to integrate with the Lambda function
    const resource = api.root.addResource('render-image');
    resource.addMethod('POST', new apigateway.LambdaIntegration(htmlToImageFunction, {
      proxy: true,
    }));

    // Create a simple HTML renderer Lambda function (original example)
    const htmlRendererFunction = new lambda.Function(this, 'HtmlRendererFunction', {
      runtime: lambda.Runtime.NODEJS_18_X, // Use Node.js 18.x for consistency
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      description: 'Lambda function that renders HTML content',
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Create a resource and method for the HTML renderer
    const htmlResource = api.root.addResource('render');
    htmlResource.addMethod('GET', new apigateway.LambdaIntegration(htmlRendererFunction, {
      proxy: true,
    }));

    // Output the API Gateway URL for HTML to Image endpoint
    new cdk.CfnOutput(this, 'HtmlToImageApiUrl', {
      value: `${api.url}render-image`,
      description: 'URL of the HTML to Image API endpoint',
    });

    // Output the API Gateway URL for HTML renderer endpoint
    new cdk.CfnOutput(this, 'HtmlRendererApiUrl', {
      value: `${api.url}render`,
      description: 'URL of the HTML renderer API endpoint',
    });

    // Output the S3 bucket name
    new cdk.CfnOutput(this, 'ScreenshotBucketName', {
      value: screenshotBucket.bucketName,
      description: 'Name of the S3 bucket for screenshots',
    });
  }
}