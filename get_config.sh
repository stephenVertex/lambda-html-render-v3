#!/bin/bash

# Get the stack name using cdk list
stack_name=$(npx cdk list)
if [ -z "$stack_name" ]; then
    echo "Error: Could not get stack name"
    exit 1
fi

echo "Found stack: $stack_name"

# Get stack outputs using AWS CLI
stack_outputs=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query "Stacks[0].Outputs")
if [ $? -ne 0 ]; then
    echo "Error: Could not get stack outputs"
    exit 1
fi

# Extract values using jq
html_renderer_url=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey=="HtmlRendererApiUrl") | .OutputValue')
html_to_image_endpoint=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey=="HtmlToImageApiEndpointEF9B3FA8") | .OutputValue')
html_to_image_url=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey=="HtmlToImageApiUrl") | .OutputValue')
screenshot_bucket=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey=="ScreenshotBucketName") | .OutputValue')

# Get stack ARN
stack_arn=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query "Stacks[0].StackId" --output text)

# Create or overwrite .env file
cat > .env << EOL
# Generated from CDK deployment on $(date)
HTML_RENDERER_API_URL=${html_renderer_url}
HTML_TO_IMAGE_API_ENDPOINT=${html_to_image_endpoint}
HTML_TO_IMAGE_API_URL=${html_to_image_url}
SCREENSHOT_BUCKET_NAME=${screenshot_bucket}
STACK_ARN=${stack_arn}
EOL

# Make the script executable
chmod +x get_config.sh

echo "Configuration has been saved to .env file"
echo "You can now use 'source .env' to load these variables" 