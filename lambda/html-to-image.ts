import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Initialize S3 client
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

// Define screenshot options interface
interface ScreenshotOptions {
  type?: 'png' | 'jpeg';
  fullPage?: boolean;
  encoding?: 'binary' | 'base64';
  quality?: number;
}

/**
 * Lambda function that renders HTML content to an image using Puppeteer
 * @param event - API Gateway proxy event
 * @returns Image as base64 or S3 URL
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Get HTML content from request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const requestBody = JSON.parse(event.body);
    const htmlContent = requestBody.html;
    const outputType = requestBody.outputType || 'base64'; // 'base64' or 's3'
    const imageFormat = requestBody.imageFormat || 'png'; // 'png' or 'jpeg'
    const imageQuality = requestBody.imageQuality || 80; // For JPEG only
    const viewportWidth = requestBody.viewportWidth || 1280;
    const viewportHeight = requestBody.viewportHeight || 800;
    const fullPage = requestBody.fullPage || false;
    
    if (!htmlContent) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'HTML content is required' })
      };
    }

    // Decode base64 HTML if provided
    let decodedHtml: string;
    try {
      decodedHtml = Buffer.from(htmlContent, 'base64').toString('utf-8');
    } catch (error) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid base64 encoded HTML' })
      };
    }

    // Identify whether we are running locally or in AWS
    const isLocal = process.env.AWS_EXECUTION_ENV === undefined;
    
    // Launch browser with appropriate configuration based on environment
    console.log('Launching browser...');
    let browser;
    
    if (isLocal) {
      // If running locally, use the installed puppeteer
      browser = await require('puppeteer').launch();
    } else {
      // If running in AWS, download and use a compatible version of chromium at runtime
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: {
          width: viewportWidth,
          height: viewportHeight
        },
        executablePath: await chromium.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar'
        ),
        headless: true, // Use boolean value instead of chromium.headless
        ignoreHTTPSErrors: true,
      });
    }

    console.log('Browser launched successfully');

    // Create a new page
    const page = await browser.newPage();
    
    // Set content
    console.log('Setting HTML content...');
    await page.setContent(decodedHtml, { 
      waitUntil: 'networkidle0',
      timeout: 20000 // Increase timeout for content loading
    });

    // Take screenshot
    console.log('Taking screenshot...');
    const screenshotOptions: ScreenshotOptions = {
      type: imageFormat as 'png' | 'jpeg',
      fullPage: fullPage,
      encoding: 'binary'
    };
    
    if (imageFormat === 'jpeg') {
      screenshotOptions.quality = imageQuality;
    }
    
    const screenshot = await page.screenshot(screenshotOptions) as Buffer;
    
    // Close browser
    await browser.close();
    
    // Handle output based on requested type
    if (outputType === 's3' && BUCKET_NAME) {
      // Upload to S3
      console.log('Uploading to S3...');
      const fileKey = `screenshots/${randomUUID()}.${imageFormat}`;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: screenshot,
        ContentType: imageFormat === 'png' ? 'image/png' : 'image/jpeg'
      }));
      
      // Generate signed URL
      const signedUrl = await getSignedUrl(
        s3Client, 
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey
        }), 
        { expiresIn: 3600 } // URL expires in 1 hour
      );
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Screenshot saved to S3',
          url: signedUrl,
          key: fileKey
        })
      };
    } else {
      // Return as base64
      console.log('Returning base64 image...');
      const base64Image = Buffer.from(screenshot).toString('base64');
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Screenshot generated successfully',
          imageFormat,
          image: base64Image
        })
      };
    }
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Failed to process HTML: ${error.message}` })
    };
  }
};