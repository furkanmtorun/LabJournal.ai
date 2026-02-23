import json
import os
import boto3
from opensearchpy import AWSV4SignerAuth, OpenSearch, RequestsHttpConnection

# Clients & Auth
bedrock = boto3.client("bedrock-runtime")
region = os.environ["REGION"]
host = os.environ["OS_ENDPOINT"]
credentials = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(credentials, region, "es")

os_client = OpenSearch(
    hosts=[{"host": host, "port": 443}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
)

INDEX_NAME = "experiments_index"

def handler(event, context):
    create_index_if_not_exists()

    for record in event["Records"]:
        event_name = record["eventName"]
        
        # 1. HANDLE DELETIONS
        if event_name == "REMOVE":
            # In a REMOVE event, only 'Keys' are guaranteed to exist
            doc_id = record["dynamodb"]["Keys"].get("id", {}).get("S")
            if doc_id:
                try:
                    os_client.delete(index=INDEX_NAME, id=doc_id)
                    print(f"Successfully deleted doc {doc_id} from OpenSearch")
                except Exception as e:
                    # Ignore 404s if the document was already gone
                    print(f"Error deleting doc {doc_id}: {e}")

        # 2. HANDLE UPDATES/INSERTS
        elif event_name in ["INSERT", "MODIFY"]:
            new_image = record["dynamodb"]["NewImage"]
            doc_id = new_image.get("id", {}).get("S", "")
            text_to_embed = new_image.get("result", {}).get("S", "")

            if not text_to_embed:
                continue

            # Get Embedding from Bedrock
            embedding = get_embedding(text_to_embed)

            # Index the document
            document = {
                "text": text_to_embed,
                "result_vector": embedding,
                "metadata": {k: list(v.values())[0] for k, v in new_image.items()},
            }

            os_client.index(index=INDEX_NAME, body=document, id=doc_id)
            print(f"Successfully indexed doc {doc_id}")

    return {"status": "success"}

def get_embedding(text):
    body = json.dumps({"inputText": text})
    response = bedrock.invoke_model(
        body=body,
        modelId="amazon.titan-embed-text-v1",
        accept="application/json",
        contentType="application/json",
    )
    return json.loads(response.get("body").read()).get("embedding")

def create_index_if_not_exists():
    if not os_client.indices.exists(index=INDEX_NAME):
        settings = {
            "settings": {"index.knn": True},
            "mappings": {
                "properties": {
                    "result_vector": {
                        "type": "knn_vector",
                        "dimension": 1536,
                        "method": {"name": "hnsw", "space_type": "l2", "engine": "faiss"},
                    },
                    "text": {"type": "text"},
                }
            },
        }
        os_client.indices.create(index=INDEX_NAME, body=settings)