import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Lambda function that renders HTML content
 * @param event - API Gateway proxy event
 * @returns HTML response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event: ', event);
  
  // Get name from query string parameter or use default
  const name = event.queryStringParameters?.name || 'World';
  
  // Create HTML content
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Renderer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #0066cc;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello, ${name}!</h1>
        <p>This HTML was rendered by a Lambda function.</p>
        <p>Current time: ${new Date().toISOString()}</p>
    </div>
</body>
</html>
  `;
  
  // Return response
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: htmlContent,
  };
};