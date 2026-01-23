import os
import json
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

# Clients & Auth
bedrock = boto3.client("bedrock-runtime")
region = os.environ['REGION']
host = os.environ['OS_ENDPOINT']
credentials = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(credentials, region, 'es')

os_client = OpenSearch(
    hosts=[{'host': host, 'port': 443}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

INDEX_NAME = "experiments_index"

def create_index_if_not_exists():
    """Checks for index and creates it with k-NN (Vector) settings if missing."""
    if not os_client.indices.exists(index=INDEX_NAME):
        settings = {
            "settings": {
                "index.knn": True  # Enables Vector Search
            },
            "mappings": {
                "properties": {
                    "result_vector": {
                        "type": "knn_vector",
                        "dimension": 1536, # Required for Titan Embeddings
                        "method": {
                            "name": "hnsw",
                            "space_type": "l2",
                            "engine": "nmslib"
                        }
                    },
                    "text": {"type": "text"}
                }
            }
        }
        os_client.indices.create(index=INDEX_NAME, body=settings)

def handler(event, context):
    # Ensure the database is ready for vectors
    create_index_if_not_exists()

    for record in event['Records']:
        if record['eventName'] in ['INSERT', 'MODIFY']:
            new_image = record['dynamodb']['NewImage']
            text_to_embed = new_image.get('result', {}).get('S', "")
            doc_id = new_image.get('id', {}).get('S', "")

            if not text_to_embed: continue

            # Get Embedding from Bedrock
            body = json.dumps({"inputText": text_to_embed})
            response = bedrock.invoke_model(
                body=body, 
                modelId="amazon.titan-embed-text-v1", 
                accept="application/json", 
                contentType="application/json"
            )
            embedding = json.loads(response.get('body').read()).get('embedding')

            # Index the document
            document = {
                "text": text_to_embed,
                "result_vector": embedding,
                "metadata": {k: list(v.values())[0] for k, v in new_image.items()}
            }
            
            os_client.index(index=INDEX_NAME, body=document, id=doc_id)
            
    return {"status": "success"}