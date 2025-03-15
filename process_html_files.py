import os
import base64
import json
import random
import string
import hashlib

def generate_test_id():
    """Generate a random 4 character test ID."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=4))

def process_html_file(html_path):
    """Process a single HTML file and return its base64 encoded content."""
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    return base64.b64encode(html_content.encode('utf-8')).decode('utf-8')

def get_file_hash(file_path):
    """Calculate SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def create_input_file(html_path, base64_content):
    """Create an input JSON file with the specified parameters."""
    filename = os.path.basename(html_path)
    
    # Create output filename (replace .html with .json)
    output_filename = os.path.splitext(filename)[0] + '.json'
    output_path = os.path.join('input', output_filename)
    
    # Calculate hash of source HTML file (for tracking purposes only)
    html_hash = get_file_hash(html_path)
    
    test_id = generate_test_id()
    input_data = {
        "test_id": test_id,
        "test_description": f"Rendering test for {filename}",
        "html": base64_content,
        "outputType": "s3",
        "imageFormat": "png",
        "targetSelector": "#target-container",
        "viewportWidth": 2560,  # 2K width
        "viewportHeight": 1440,  # 2K height
        "source_hash": html_hash  # Store the hash for reference
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(input_data, f, indent=2)
    
    print(f"Created/Updated input file: {output_path}")

def main():
    # Walk through the old-inputs directory
    for root, _, files in os.walk('old-inputs'):
        for file in files:
            if file.endswith('.html'):
                html_path = os.path.join(root, file)
                try:
                    # Process the HTML file
                    base64_content = process_html_file(html_path)
                    # Create corresponding input file
                    create_input_file(html_path, base64_content)
                except Exception as e:
                    print(f"Error processing {html_path}: {str(e)}")

if __name__ == "__main__":
    main() 