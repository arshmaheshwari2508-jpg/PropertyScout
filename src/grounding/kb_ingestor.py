"""
Knowledge Base Ingestion Engine for Voice-First AI Property Scout.
Ingests:
  1. Docs/sources.jsonl
  2. Docs/localities.jsonl (82+ record-preserving atomic locality profiles)
  3. Docs/safety_sources.jsonl
  4. Docs/Readme.md

Uses BAAI/bge-small-en-v1.5 embeddings via FastEmbed (ONNX)
and stores vector records into ChromaDB while preserving source IDs,
do_not_infer constraints, and metadata.
"""

import json
import os
import re
from typing import List, Dict, Any

from fastembed import TextEmbedding
import chromadb


class KnowledgeBaseIngestor:
    def __init__(
        self,
        docs_dir: str = "Docs",
        db_dir: str = "data/chroma_db",
        model_name: str = "BAAI/bge-small-en-v1.5"
    ):
        self.docs_dir = docs_dir
        self.db_dir = db_dir
        self.model_name = model_name
        
        # Load FastEmbed BAAI/bge-small-en-v1.5 ONNX embedding model
        print(f"Loading FastEmbed model: {self.model_name}...", flush=True)
        self.embedding_model = TextEmbedding(model_name=self.model_name)
        
        # Initialize Persistent ChromaDB client
        os.makedirs(self.db_dir, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=self.db_dir)
        self.collection = self.chroma_client.get_or_create_collection(
            name="neighborhood_kb",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Sources lookup dictionary
        self.sources_map: Dict[str, Dict[str, Any]] = {}

    def load_sources(self) -> Dict[str, Dict[str, Any]]:
        """Parses Docs/sources.jsonl to load source taxonomy."""
        sources_path = os.path.join(self.docs_dir, "sources.jsonl")
        if not os.path.exists(sources_path):
            raise FileNotFoundError(f"Missing {sources_path}")
            
        with open(sources_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    item = json.loads(line)
                    self.sources_map[item["source_id"]] = item
                    
        print(f"Loaded {len(self.sources_map)} source taxonomy records.", flush=True)
        return self.sources_map

    def ingest_all(self) -> int:
        """Runs complete ingestion across the 4 Knowledge Base files."""
        self.load_sources()
        
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        ids: List[str] = []
        
        # 1. Ingest localities.jsonl (Atomic Record-Preserving Entity Chunking)
        localities_path = os.path.join(self.docs_dir, "localities.jsonl")
        if os.path.exists(localities_path):
            with open(localities_path, "r", encoding="utf-8") as f:
                for idx, line in enumerate(f):
                    line = line.strip()
                    if not line:
                        continue
                    item = json.loads(line)
                    
                    loc_id = item.get("id", f"loc_{idx}")
                    locality_name = item.get("locality", "")
                    region = item.get("region", "")
                    content = item.get("content", "")
                    sources = item.get("sources", [])
                    supported_topics = item.get("supported_topics", [])
                    do_not_infer = item.get("do_not_infer", [])
                    
                    # Construct augmented payload text string for dense semantic vector search
                    augmented_text = f"[Locality: {locality_name} | Region: {region} | Topics: {', '.join(supported_topics)}]\n{content}"
                    
                    # Resolve primary source metadata
                    primary_src_id = sources[0] if sources else "SRC_WIKI_NEIGHBORHOODS"
                    src_info = self.sources_map.get(primary_src_id, {})
                    
                    documents.append(augmented_text)
                    metadatas.append({
                        "doc_id": loc_id,
                        "locality": locality_name,
                        "region": region,
                        "doc_type": "neighborhood_profile",
                        "sources_json": json.dumps(sources),
                        "source_id": primary_src_id,
                        "source_name": src_info.get("name", primary_src_id),
                        "source_type": src_info.get("type", "public_reference"),
                        "supported_topics": json.dumps(supported_topics),
                        "do_not_infer": json.dumps(do_not_infer),
                        "source_weight": 1.0
                    })
                    ids.append(loc_id)
                    
        # 2. Ingest safety_sources.jsonl
        safety_path = os.path.join(self.docs_dir, "safety_sources.jsonl")
        if os.path.exists(safety_path):
            with open(safety_path, "r", encoding="utf-8") as f:
                for idx, line in enumerate(f):
                    line = line.strip()
                    if not line:
                        continue
                    item = json.loads(line)
                    
                    safety_id = item.get("id", f"safety_{idx}")
                    title = item.get("title", "Safety Evidence")
                    usage = item.get("usage", "")
                    allowed_claims = item.get("allowed_claims", [])
                    forbidden_inference = item.get("forbidden_inference", [])
                    src_id = item.get("source_id", "SRC_KAR_POLICE_CRIME_2025")
                    
                    text_payload = f"[Safety Dataset: {title}]\nUsage Guide: {usage}\nAllowed Claims: {', '.join(allowed_claims)}"
                    src_info = self.sources_map.get(src_id, {})
                    
                    documents.append(text_payload)
                    metadatas.append({
                        "doc_id": safety_id,
                        "locality": "ALL_BENGALURU",
                        "region": "State/City",
                        "doc_type": "safety_evidence",
                        "sources_json": json.dumps([src_id]),
                        "source_id": src_id,
                        "source_name": src_info.get("name", "Crime Review 2025"),
                        "source_type": src_info.get("type", "official_government_dataset"),
                        "allowed_claims": json.dumps(allowed_claims),
                        "forbidden_inference": json.dumps(forbidden_inference),
                        "source_weight": 1.0
                    })
                    ids.append(safety_id)

        # 3. Ingest Readme.md (Recursive Markdown Header Chunking)
        readme_path = os.path.join(self.docs_dir, "Readme.md")
        if os.path.exists(readme_path):
            with open(readme_path, "r", encoding="utf-8") as f:
                readme_text = f.read()
                
            sections = re.split(r'\n(?=##?\s+)', readme_text)
            for idx, section in enumerate(sections):
                section = section.strip()
                if not section:
                    continue
                    
                section_id = f"readme_section_{idx}"
                documents.append(section)
                metadatas.append({
                    "doc_id": section_id,
                    "locality": "ALL_BENGALURU",
                    "region": "Policy Guidelines",
                    "doc_type": "policy_readme",
                    "sources_json": json.dumps(["SRC_WIKI_NEIGHBORHOODS"]),
                    "source_id": "SRC_WIKI_NEIGHBORHOODS",
                    "source_name": "Knowledge Base Readme",
                    "source_type": "policy_guide",
                    "source_weight": 1.0
                })
                ids.append(section_id)

        # Generate BAAI/bge-small-en-v1.5 FastEmbed (ONNX) dense vectors
        print(f"Generating dense vector embeddings for {len(documents)} document chunks via FastEmbed...", flush=True)
        raw_embeddings = list(self.embedding_model.embed(documents))
        embeddings_list = [[float(val) for val in vector] for vector in raw_embeddings]
        
        # Insert into ChromaDB collection
        print(f"Upserting {len(documents)} vector records into ChromaDB persistent store at '{self.db_dir}'...", flush=True)
        self.collection.upsert(
            documents=documents,
            embeddings=embeddings_list,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"✅ Ingestion Complete! ChromaDB collection '{self.collection.name}' now contains {self.collection.count()} items.", flush=True)
        return self.collection.count()


if __name__ == "__main__":
    ingestor = KnowledgeBaseIngestor()
    ingestor.ingest_all()
