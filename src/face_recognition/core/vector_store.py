"""
Vector store module for Pinecone operations.
"""
from pinecone import Pinecone
import logging
import time
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class VectorStore:
    """
    Class for managing vector operations with Pinecone.
    """
    def __init__(self, api_key: str, index_name: str):
        """
        Initialize the Pinecone vector store.
        
        Args:
            api_key (str): Pinecone API key
            index_name (str): Name of the Pinecone index
        """
        self.api_key = api_key
        self.index_name = index_name
        
        # Initialize Pinecone client with the latest API
        self.pc = Pinecone(api_key=api_key)
        self.index = self.pc.Index(index_name)
        
        logger.info(f"Pinecone vector store initialized with index: {index_name}")
    
    def query(self, vector: List[float], top_k: int = 2, include_values: bool = True) -> Dict[str, Any]:
        """
        Query the vector store for similar vectors.
        
        Args:
            vector (List[float]): Query vector
            top_k (int): Number of results to return
            include_values (bool): Whether to include vector values in the response
            
        Returns:
            Dict[str, Any]: Query results
        """
        try:
            start_time = time.time()
            query_result = self.index.query(
                vector=vector,
                top_k=top_k,
                include_values=include_values
            )
            query_time = time.time() - start_time
            
            logger.info(f"Query completed in {query_time:.2f}s, found {len(query_result['matches'])} matches")
            return query_result
        except Exception as e:
            logger.error(f"Error querying Pinecone: {str(e)}")
            raise
    
    def upsert(self, vectors: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Upsert vectors to the vector store.
        
        Args:
            vectors (List[Dict[str, Any]]): List of vectors to upsert
                Each vector should have 'id', 'values', and optional 'metadata'
            
        Returns:
            Dict[str, Any]: Upsert response
        """
        try:
            start_time = time.time()
            response = self.index.upsert(vectors=vectors)
            upsert_time = time.time() - start_time
            
            logger.info(f"Upsert completed in {upsert_time:.2f}s, upserted {len(vectors)} vectors")
            return response
        except Exception as e:
            logger.error(f"Error upserting to Pinecone: {str(e)}")
            raise
    
    def delete(self, ids: List[str]) -> Dict[str, Any]:
        """
        Delete vectors from the vector store.
        
        Args:
            ids (List[str]): List of vector IDs to delete
            
        Returns:
            Dict[str, Any]: Delete response
        """
        try:
            response = self.index.delete(ids=ids)
            logger.info(f"Deleted {len(ids)} vectors from Pinecone")
            return response
        except Exception as e:
            logger.error(f"Error deleting from Pinecone: {str(e)}")
            raise
    
    def describe_index_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the Pinecone index.
        
        Returns:
            Dict[str, Any]: Index statistics
        """
        try:
            stats = self.index.describe_index_stats()
            logger.info(f"Index stats: {stats}")
            return stats
        except Exception as e:
            logger.error(f"Error getting index stats: {str(e)}")
            raise
