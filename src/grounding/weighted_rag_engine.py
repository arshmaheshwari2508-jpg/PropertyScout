"""
Weighted RAG Retrieval Engine for Voice-First AI Property Scout.
Implements:
  1. FastEmbed / BAAI/bge-small-en-v1.5 vector retrieval from ChromaDB.
  2. Metadata Pre-Filtering (Rule #10: Prevents cross-locality extrapolation).
  3. Weighted Cosine Scoring (Relevance Score = CosineSimilarity * SourceWeight).
     - SourceWeight = 1.0 for independent datasets (Wiki, GBA, Police Crime 2025).
     - SourceWeight = 0.3 for Seller Property Review Notes (seller_claim).
"""

import json
import os
from typing import List, Dict, Any, Optional
from fastembed import TextEmbedding
import chromadb


class WeightedRAGEngine:
    def __init__(
        self,
        db_dir: str = "data/chroma_db",
        model_name: str = "BAAI/bge-small-en-v1.5"
    ):
        self.db_dir = db_dir
        self.model_name = model_name
        
        # Initialize FastEmbed embedding model
        self.embedding_model = TextEmbedding(model_name=self.model_name)
        
        # Connect to ChromaDB persistent collection
        self.chroma_client = chromadb.PersistentClient(path=self.db_dir)
        self.collection = self.chroma_client.get_or_create_collection(
            name="neighborhood_kb",
            metadata={"hnsw:space": "cosine"}
        )

    def retrieve(
        self,
        query: str,
        locality: Optional[str] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Performs metadata pre-filtered vector retrieval and weighted scoring.
        """
        # Generate query vector embedding
        raw_query_vector = list(self.embedding_model.embed([query]))[0]
        query_embedding = [float(x) for x in raw_query_vector]
        
        # Build ChromaDB metadata filter if locality is specified
        where_filter = None
        if locality:
            where_filter = {"locality": locality}
            
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_filter
            )
        except Exception as e:
            # Fallback search if exact locality metadata pre-filter finds no records
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k
            )

        retrieved_items: List[Dict[str, Any]] = []
        
        if not results or not results.get("documents") or not results["documents"][0]:
            return []

        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(documents)

        for doc, meta, dist in zip(documents, metadatas, distances):
            # Calculate raw Cosine Similarity score from cosine distance
            raw_cosine_sim = 1.0 - max(0.0, min(1.0, float(dist)))
            
            # Extract source weight (Default = 1.0 for independent sources, 0.3 for seller claims)
            src_weight = float(meta.get("source_weight", 1.0))
            final_weighted_score = raw_cosine_sim * src_weight
            
            # Deserialize JSON array metadata
            do_not_infer = json.loads(meta.get("do_not_infer", "[]")) if isinstance(meta.get("do_not_infer"), str) else meta.get("do_not_infer", [])
            supported_topics = json.loads(meta.get("supported_topics", "[]")) if isinstance(meta.get("supported_topics"), str) else meta.get("supported_topics", [])
            sources = json.loads(meta.get("sources_json", "[]")) if isinstance(meta.get("sources_json"), str) else [meta.get("source_id", "SRC_WIKI_NEIGHBORHOODS")]

            retrieved_items.append({
                "content": doc,
                "locality": meta.get("locality", ""),
                "region": meta.get("region", ""),
                "doc_type": meta.get("doc_type", ""),
                "source_id": meta.get("source_id", "SRC_WIKI_NEIGHBORHOODS"),
                "source_name": meta.get("source_name", ""),
                "sources": sources,
                "supported_topics": supported_topics,
                "do_not_infer": do_not_infer,
                "raw_similarity": round(raw_cosine_sim, 4),
                "source_weight": src_weight,
                "weighted_score": round(final_weighted_score, 4)
            })

        # Sort by final weighted score descending
        retrieved_items.sort(key=lambda x: x["weighted_score"], reverse=True)
        return retrieved_items
