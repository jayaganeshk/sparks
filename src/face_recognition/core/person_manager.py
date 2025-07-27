"""
Person manager module for DynamoDB operations.
"""
import boto3
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class PersonManager:
    """
    Class for managing person data in DynamoDB.
    """
    def __init__(self, table_name: str):
        """
        Initialize the person manager.
        
        Args:
            table_name (str): DynamoDB table name
        """
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = table_name
        self.table = self.dynamodb.Table(table_name)
        
        logger.info(f"Person manager initialized with table: {table_name}")
    
    def get_new_person_id(self) -> int:
        """
        Get a new person ID by incrementing the counter in DynamoDB.
        
        Returns:
            int: New person ID
        """
        try:
            # Auto increment limit value for PK and SK = UNKNOWN_PERSONS and get new value of limit
            response = self.table.update_item(
                Key={
                    "PK": "UNKNOWN_PERSONS",
                    "SK": "UNKNOWN_PERSONS",
                },
                UpdateExpression="SET #attrName = #attrName + :val",
                ExpressionAttributeNames={"#attrName": "limit"},
                ExpressionAttributeValues={":val": 1},
                ReturnValues="ALL_NEW",
            )
            new_id = response["Attributes"]["limit"]
            logger.info(f"Generated new person ID: {new_id}")
            return new_id
        except Exception as e:
            logger.error(f"Error generating new person ID: {str(e)}")
            raise
    
    def insert_new_person(self, person_id: int, s3_key: str) -> Dict[str, Any]:
        """
        Insert a new person into DynamoDB.
        
        Args:
            person_id (int): Person ID
            s3_key (str): S3 key for the person's face image
            
        Returns:
            Dict[str, Any]: DynamoDB response
        """
        try:
            name = f"person{person_id}"
            item = {
                "PK": f"PERSON#{name}",
                "SK": name,
                "displayName": name,
                "entityType": "PERSON",
                "s3Key": s3_key,
            }
            
            response = self.table.put_item(Item=item)
            logger.info(f"Inserted new person: {name}")
            return response
        except Exception as e:
            logger.error(f"Error inserting new person: {str(e)}")
            raise
    
    def insert_person_tagging(self, image_id: str, person_name: str, s3_key: str) -> Dict[str, Any]:
        """
        Insert a person tagging record into DynamoDB.
        
        Args:
            image_id (str): Image ID
            person_name (str): Person name
            s3_key (str): S3 key for the image
            
        Returns:
            Dict[str, Any]: DynamoDB response
        """
        try:
            item = {
                "PK": image_id,
                "SK": f"PERSON#{person_name}",
                "entityType": f"TAGGING#{person_name}",
                "s3Key": s3_key,
            }
            
            response = self.table.put_item(Item=item)
            logger.info(f"Inserted person tagging: {image_id} -> {person_name}")
            return response
        except Exception as e:
            logger.error(f"Error inserting person tagging: {str(e)}")
            raise
    
    def check_unknown_persons_key(self) -> None:
        """
        Check if the UNKNOWN_PERSONS key exists in DynamoDB, create it if not.
        """
        try:
            # Query for the UNKNOWN_PERSONS key
            response = self.table.query(
                IndexName="entityType-PK-index",
                KeyConditionExpression="entityType = :entityType and PK = :PK",
                ExpressionAttributeValues={
                    ":entityType": "UNKNOWN_PERSONS",
                    ":PK": "UNKNOWN_PERSONS",
                },
            )
            
            # If the key doesn't exist, create it
            if len(response["Items"]) == 0:
                logger.info("UNKNOWN_PERSONS key not found, creating it")
                self.table.put_item(
                    Item={
                        "PK": "UNKNOWN_PERSONS",
                        "SK": "UNKNOWN_PERSONS",
                        "entityType": "UNKNOWN_PERSONS",
                        "limit": 0,
                    }
                )
                logger.info("Created UNKNOWN_PERSONS key")
            else:
                logger.info("UNKNOWN_PERSONS key already exists")
        except Exception as e:
            logger.error(f"Error checking UNKNOWN_PERSONS key: {str(e)}")
            raise
