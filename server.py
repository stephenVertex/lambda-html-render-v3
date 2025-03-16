from mcp.server.fastmcp import FastMCP
import httpx
import os
from dotenv import load_dotenv
from typing import Any

# Load environment variables
load_dotenv()

# Create an MCP server
mcp = FastMCP("HTML to Image Service")

@mcp.tool()
async def render_image(
    html: str,
    outputType: str = "s3",
    imageFormat: str = "png",
    targetSelector: str = "#target-container",
    viewportWidth: int | None = None,
    viewportHeight: int | None = None,
    fullPage: bool | None = None,
    imageQuality: int | None = None
) -> dict[str, Any]:
    """Convert HTML to image using AWS Lambda function
    
    Args:
        html: Base64-encoded HTML content to convert
        outputType: Output format type (default: "s3")
        imageFormat: Image format (default: "png")
        targetSelector: CSS selector for the element to capture (default: "#target-container")
        viewportWidth: Viewport width in pixels
        viewportHeight: Viewport height in pixels
        fullPage: Whether to capture the full scrollable page
        imageQuality: JPEG image quality (1-100, only for jpeg format)
        
    Note:
        The html parameter must be base64-encoded. Raw HTML will not be accepted.
    """
    lambda_endpoint = os.getenv("HTML_TO_IMAGE_API_URL")
    if not lambda_endpoint:
        raise Exception("Lambda endpoint URL not configured")

    # Build request payload with only non-None values
    payload = {
        "html": html,
        "outputType": outputType,
        "imageFormat": imageFormat,
        "targetSelector": targetSelector
    }
    
    if viewportWidth is not None:
        payload["viewportWidth"] = viewportWidth
    if viewportHeight is not None:
        payload["viewportHeight"] = viewportHeight
    if fullPage is not None:
        payload["fullPage"] = fullPage
    if imageQuality is not None:
        payload["imageQuality"] = imageQuality

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                lambda_endpoint,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(str(e))

if __name__ == "__main__":
    mcp.run(host="0.0.0.0", port=8000) 