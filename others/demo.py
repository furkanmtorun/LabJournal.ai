import boto3
import base64
import json
import streamlit as st

template = """
Date: [Insert Date]

Time: [Insert Time]

Experiment Title: [Insert Title]

Aim: [Briefly describe what you aim to achieve with this experiment]

Materials:
[List all materials, reagents, and equipment used]

Protocols:

1. [Protocol Name]
Materials: [List specific materials for this protocol]
Procedure:

- Step 1: [Detailed step]
- Step 2: [Detailed step]
- Step 3: [Detailed step]
Observations/Notes: [Any observations or deviations from the protocol]

2. [Protocol Name]
Materials: [List specific materials for this protocol]
Procedure:

- Step 1: [Detailed step]
- Step 2: [Detailed step]
- Step 3: [Detailed step]
Observations/Notes: [Any observations or deviations from the protocol]

3. [Protocol Name]
Materials: [List specific materials for this protocol]
Procedure:
- Step 1: [Detailed step]
- Step 2: [Detailed step]
- Step 3: [Detailed step]
Observations/Notes: [Any observations or deviations from the protocol]

Results: [Summarize the results or attach data]

Discussion: [Interpret the results, discuss any issues or successes]

Conclusion: [Summarize the findings and next steps]

References: [List any literature or sources referenced]
"""


def send_image_to_nova_pro(image_bytes):
    # Create a Bedrock Runtime client
    client = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    # Encode the image to Base64
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    
    # Define the request body
    request_body = {
        "inferenceConfig": {
            "max_new_tokens": 1000
        },
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": "jpeg",  # Adjust based on your image format
                            "source": {
                                "bytes": image_base64
                            }
                        }
                    },
                    {
                        "text": f"""This is a lab journal about the experiment. Convert this photo of the page into the text. 
                        Fix the grammar, turn them into scientific sentences and fit the content into this template: {template}."""
                    }
                ]
            }
        ]
    }
    
    # Invoke the model using invoke_model
    try:
        response = client.invoke_model(
            modelId="amazon.nova-pro-v1:0",
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body)
        )
        
        # Decode the response body
        response_body = json.loads(response['body'].read().decode('utf-8'))
        
        # Extract the response text
        response_text = response_body['output']['message']['content'][0]['text']
        return response_text

    except Exception as e:
        return f"An error occurred: {e}"

# Streamlit part for uploading and processing the image
st.title('Image Description with Amazon Nova Pro')
uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "png", "jpeg"])

if uploaded_file is not None:
    image_bytes = uploaded_file.getvalue()
    st.image(image_bytes, caption='Uploaded Image.')
    st.write("Processing...")
    description = send_image_to_nova_pro(image_bytes)
    st.write(description)