#!/bin/bash

# Source the environment variables
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please run ./get_config.sh first."
    exit 1
fi

source .env

if [ -z "$HTML_TO_IMAGE_API_URL" ]; then
    echo "Error: HTML_TO_IMAGE_API_URL not found in .env"
    exit 1
fi

http POST "$HTML_TO_IMAGE_API_URL" < input/test-html-to-image.json
http POST "$HTML_TO_IMAGE_API_URL" < input/test-html-to-image-s3.json