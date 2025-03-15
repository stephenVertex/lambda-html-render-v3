# HTML to Image Lambda Function

This project contains an AWS Lambda function that renders HTML content to an image using Puppeteer and the [@sparticuz/chromium](https://github.com/Sparticuz/chromium) package. The project is deployed using AWS CDK.

## Features

- Render HTML content to PNG or JPEG images
- Return images as base64-encoded strings or upload to S3 and return a signed URL
- Configure viewport size, image quality, and other rendering options
- Deployed with API Gateway for easy access

## Development Tools

This project was developed using:
- [Cursor.sh](https://cursor.sh/) v0.47.6 - An AI-powered code editor
- Amazon Q CLI - AWS's AI-powered developer tool
- AWS CDK - Infrastructure as Code tool for AWS

## Architecture

The project includes:

1. **HTML to Image Lambda Function**: Renders HTML to images using Puppeteer and Chromium
2. **S3 Bucket**: Stores generated images when requested
3. **API Gateway**: Provides HTTP endpoints to access the Lambda functions
4. **Simple HTML Renderer**: A basic Lambda function that returns HTML content (for testing)

## API Usage

### HTML to Image Endpoint

**Endpoint**: `POST /render-image`

**Request Body**:

```json
{
  "html": "base64-encoded-html-content",
  "outputType": "base64", // or "s3"
  "imageFormat": "png", // or "jpeg"
  "imageQuality": 80, // For JPEG only (1-100)
  "viewportWidth": 1280,
  "viewportHeight": 800,
  "fullPage": false // Set to true to capture the full scrollable page
}
```

**Response (base64 mode)**:

```json
{
  "message": "Screenshot generated successfully",
  "imageFormat": "png",
  "image": "base64-encoded-image"
}
```

**Response (S3 mode)**:

```json
{
  "message": "Screenshot saved to S3",
  "url": "signed-s3-url",
  "key": "s3-object-key"
}
```

### HTML Renderer Endpoint

**Endpoint**: `GET /render?name=YourName`

Returns a simple HTML page with the provided name parameter.

## Deployment

To deploy this project:

```bash
npm install
npm run build
npx cdk deploy
```

## Local Development

To test the function locally:

```bash
npm run build
npx cdk synth
```

## Notes

- The S3 bucket is configured to automatically delete objects after 7 days
- The Lambda function has a 30-second timeout and 2GB of memory
- For production use, consider adjusting the S3 bucket's removal policy and lifecycle rules