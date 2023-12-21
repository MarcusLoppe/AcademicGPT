import re   
from communication.ClientUpdate import ClientUpdate
from langchain.text_splitter import RecursiveCharacterTextSplitter 
import chromadb  
import time,json
import sqlite3, threading
from typing import List
from transformers import AutoModel
import enum 
import torch
from models.paper import Paper 
from utils.textTools import split_on_references, insert_headline_seperation 

conn = sqlite3.connect('database/data_cache.db', check_same_thread=False)
db = conn.cursor()    

db.execute('''CREATE TABLE IF NOT EXISTS api_cache  (query TEXT PRIMARY KEY, result TEXT)''')  
db.execute('''CREATE TABLE IF NOT EXISTS paper_cache (id TEXT PRIMARY KEY, doi TEXT, date TEXT, authors TEXT, title TEXT, abstract TEXT, downloadUrl TEXT, fullText TEXT)''') 
db.execute('''CREATE TABLE IF NOT EXISTS unprocessed_paper_cache (id TEXT PRIMARY KEY, doi TEXT, date TEXT, authors TEXT, title TEXT, abstract TEXT, downloadUrl TEXT, fullText TEXT)''') 
conn.commit() 

lock = threading.Lock()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = AutoModel.from_pretrained('jinaai/jina-embeddings-v2-base-en',trust_remote_code=True).to(device)
client_papers = chromadb.PersistentClient(path="database/paper_emdeddings_db")
 
pdf_collection = client_papers.get_or_create_collection(name="paper" , metadata={"hnsw:space": "cosine"}) 

paper_previews = client_papers.get_or_create_collection(name="paper_previews" , metadata={"hnsw:space": "cosine"}) 
unprocessed_papers = client_papers.get_or_create_collection(name="unprocessed_papers6" , metadata={"hnsw:space": "cosine"}) 
  
class TableName(enum.Enum):
    PAPER_CACHE = "paper_cache"
    UNPROCESSED_PAPER_CACHE = "unprocessed_paper_cache"
    API_CACHE = "api_cache"

 
def is_paper_embedded(id): 
    existQuery = pdf_collection.get(str(id) + "_1")
    exits = len(existQuery["ids"]) > 0 
    return exits

# Database access functions
def execute_query(query, params=()):
    with lock:
        db.execute(query, params)
        return db.fetchall() if "SELECT" in query else None

def insert_paper(paper: Paper, table_enum: TableName, locked = False):
    query, values = paper.get_insert_query(table_enum.value)
    if locked:
        db.execute(query, values)
    else:
        execute_query(query, values)

def get_paper(paper_id, table_enum: TableName) -> Paper:
    table_name = table_enum.value
    row = execute_query(f"SELECT * FROM {table_name} WHERE id=?", (paper_id,))
    return Paper(*row[0]) if row else None

def get_api_cache(query):
    return execute_query("SELECT result FROM api_cache WHERE query=?", (query,))

def get_all_api_cache():
    return execute_query("SELECT query, result FROM api_cache")

def get_all_papers(table_enum: TableName):
    rows = execute_query(f"SELECT * FROM {table_enum.value}")
    return [Paper(*row) for row in rows]

def insert_api_cache(query, result):
    with lock:
        db.execute("INSERT OR REPLACE INTO api_cache (query, result) VALUES (?, ?)", (query, json.dumps(result)))
        conn.commit() 
    
 
def query_papers(query,k, query_vector = None):  
    if query_vector is None:
        query_vector = model.encode(query).tolist()  

    docs = pdf_collection.query(
        query_embeddings=[query_vector],
        n_results=k,
        include=['distances', 'documents', 'metadatas'],
    ) 
    return docs

def query_previews(query,k, query_vector = None):  
    if query_vector is None:
        query_vector = model.encode(query).tolist()  

    docs = paper_previews.query(
        query_embeddings=[query_vector],
        n_results=k,
        include=['distances', 'documents', 'metadatas'],
    ) 
    return docs
  
def query_unprocced_papers(query,k, query_vector = None):  
    if query_vector is None:
        query_vector = model.encode(query).tolist()  
        
    docs = unprocessed_papers.query(
        query_embeddings=[query_vector],
        n_results=k,
        include=['distances', 'documents', 'metadatas'],
    ) 
    return docs

def clean_unprocessed_papers():  
    papers = get_all_papers(TableName.UNPROCESSED_PAPER_CACHE)
    ids = []
    for paper in papers:
        if is_paper_embedded(paper.id):
            ids.append(paper.id)     
            db.execute("DELETE FROM unprocessed_paper_cache WHERE id=?", (paper.id,))
            
    unprocessed_papers.delete(ids = ids) 
    conn.commit()
    print(f"deleted {len(ids)} unprocessed papers")
     
def store_chunk(chunk, collection):   
    text_chunk = []
    id_chunk = []
    metadata_chunk = []
    embeddings_chunk = []

    for item in chunk: 
        if not item['text'] or len(item["text"]) < 20:
            continue
 
        text_chunk.append(item['text'])
        id_chunk.append(item['id'])
        metadata_chunk.append(item['metadata'])
 
        embedding = item.get("embedding")
        if embedding and len(embedding) >= 100:
            embeddings_chunk.append(embedding)
        else:                 
            embeddings_chunk.append(model.encode(item["text"]).tolist())
            
    id_to_embedding = dict(zip(id_chunk, embeddings_chunk))
    
    with lock:
        collection.add(
            embeddings=embeddings_chunk,
            documents=text_chunk,
            ids=id_chunk,
            metadatas=metadata_chunk
        ) 
    return id_to_embedding

def get_embeddings_collection(papers: List[Paper], updator: ClientUpdate):   
    updator.SetPending("Creating a queryable container for most relevant papers")   
    procced_papers = [] 
    all_data = []  
    container = [] 
    
    for paper in papers:  
        fullText, part2 = split_on_references(paper.fullText)   
        fullText = insert_headline_seperation(fullText)
        procced_papers.append("Processing paper " + paper.title.replace('\n','') + " content length " + str(len(fullText)))
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=2500, chunk_overlap=100)
        docs = text_splitter.create_documents([fullText]) 
        ids = [str(paper.id) + "_" + str(i) for i in range(1, len(docs)+1)]   
        insert_paper(paper, TableName.PAPER_CACHE)

        metadata = {
            "title": paper.title,
            "authors": paper.authors,
            "abstract": paper.abstract,
            "downloadUrl": paper.downloadUrl,
            "date": paper.date,
        }    
        
        query = pdf_collection.get(ids, include=['embeddings','documents','metadatas'])  
        
        if len(query["ids"]) > 0: 
            for idx, id in enumerate(query["ids"]): 
                if len(query['documents'][idx]) < 25:
                    continue
                
                container.append({ 
                    "id": id, 
                    "text": query['documents'][idx],
                    "metadata":  query['metadatas'][idx],
                    "embedding": query['embeddings'][idx]
                })  
        else: 
            for idx, doc in enumerate(docs):
                if len(doc.page_content) < 25:
                    continue
                all_data.append({
                    "text": doc.page_content,
                    "id": ids[idx],
                    "metadata": metadata
                })  
    with lock:
        conn.commit()
        
    if len(container) > 0:
        if len(all_data) == 0:
            updator.ReportSkipped(f"All emeddings already exist in vector database so no need to encode anything, got {len(container)} chunks.")
            return container, papers
        updator.ReportSuccess(f"Found {len(container)} chunks already existing in vector database, using those. Processing {len(all_data)} chunks.")
            
    updator.SetPending(f"Processed and uploaded 0/{len(all_data)}") 
  
    start_time = time.time()
    chunk_size = 10  
    for i in range(0, len(all_data), chunk_size):
        chunk = all_data[i:i+chunk_size] 
        
        text_chunk = [item['text'] for item in chunk] 
        id_chunk = [item['id'] for item in chunk]
        metadata_chunk = [item['metadata'] for item in chunk] 
        
        embeddings_chunk =[]
        for text in text_chunk:
            embeddings_chunk.append(model.encode(text).tolist()) 
        
        for idx in range(len(id_chunk)):  
            container.append({ 
                "id": id_chunk[idx], 
                "text": text_chunk[idx],
                "metadata": metadata_chunk[idx],
                "embedding": embeddings_chunk[idx]
            }) 

        elapsed_time = (time.time() - start_time) / ((i + chunk_size) / chunk_size)
        remaining_texts = len(all_data) - (i + chunk_size)
        estimated_time_remaining = (elapsed_time * (remaining_texts / chunk_size)) if remaining_texts > 0 else 0

        minutes, seconds = divmod(estimated_time_remaining, 60)
        updator.SetPending(f"Creating embedding container {i + len(chunk)}/{len(all_data)}. Estimated time remaining: {int(minutes)}m {int(seconds)}s")
 
    updator.ReportSuccess(f"Created embedding container, processed {len(all_data)} container size: {len(container)} for {len(papers)} papers")   
    updator.DocumentProccessed(f"Created embedding container - Processed documents: {len(procced_papers)} to embedding container", "Uploaded research papers to vector database", "\n".join(procced_papers)) 

    print("get_embeddings_collection end")
    return container, papers


 

def store_embedding_container(container, updator: ClientUpdate):   
    if len(container) == 0:
        return
    print("store_embedding_container start") 
    updator.SetPending(f"Processing and uploading container in vector database, container size: {len(container)}") 
    
    unique_parent_ids = set(item["id"].split("_")[0] for item in container) 
    parent_ids_modified = [id + "_1" for id in unique_parent_ids]
        
    query_result = pdf_collection.get(parent_ids_modified)
    existing_ids_modified = query_result["ids"]
 
    existing_parent_ids = [id[:-2] for id in existing_ids_modified] 
    proccess_container = [item for item in container if item["id"].split("_")[0] not in existing_parent_ids]
   
    if len(proccess_container) != len(container):
        updator.ReportSkipped(f"{(len(container)-len(proccess_container))}/{len(container)} items in the container already existed in the database")
        if len(proccess_container) == 0:
            return
    
    start_time = time.time()
    chunk_size = 10    
    
    for i in range(0, len(proccess_container), chunk_size):
        chunk = proccess_container[i:i+chunk_size] 
        store_chunk(chunk, pdf_collection)   

        elapsed_time = (time.time() - start_time) / ((i + chunk_size) / chunk_size)
        remaining_texts = len(proccess_container) - (i + chunk_size)
        estimated_time_remaining = (elapsed_time * (remaining_texts / chunk_size)) if remaining_texts > 0 else 0

        minutes, seconds = divmod(estimated_time_remaining, 60)
        updator.SetPending(f"Processed and uploaded container in vector database {i + len(chunk)}/{len(proccess_container)}. Estimated time remaining: {int(minutes)}m {int(seconds)}s")
     
    with lock:  
        ids = []
        for id_val in list(set(item['id'].split('_')[0] for item in container)):
            ids.append(id_val)
            db.execute("DELETE FROM unprocessed_paper_cache WHERE id=?", (id_val,))
        unprocessed_papers.delete(ids = ids) 
        conn.commit()
        
    updator.ReportSuccess(f"Stored the container to database, container size: {len(container)}, uploaded {len(proccess_container)}")    
 

def store_unprocced_papers(papers: List[Paper], updator: ClientUpdate):
    updator.SetPending("Storing titles and abstracts as embeddings for later usage")    
    paper_list_report = [] 
    all_data = []  
    with lock:  
        for paper in papers:
            insert_paper(paper, TableName.UNPROCESSED_PAPER_CACHE, True) 
            query = paper_previews.get(paper.id, include=['embeddings'])  
             
            if len(query["embeddings"]) > 0: 
                paper.preview_embeddings = query["embeddings"][0]#index]) 
                continue  
            
            paper_list_report.append("Processing paper " + paper.title.replace('\n','') + f" abstract length {len(paper.abstract)}")  
            metadata = {
                "title": paper.title,
                "authors": paper.authors,
                "abstract": paper.abstract,
                "downloadUrl": paper.downloadUrl,
                "date": paper.date,
            }
            data_dict = {
                "text": paper.title + "\n" + paper.abstract,
                "id": str(paper.id),
                "metadata": metadata
            } 
            all_data.append(data_dict) 
        conn.commit()   
    
    if len(all_data) == 0:
        updator.ReportSkipped("All the unprocessed papers already exist in the vector database")
        return
        
    updator.SetPending(f"Encoding 0/{len(all_data)}")  
    start_time = time.time()
    chunk_size = 10 

    for i in range(0, len(all_data), chunk_size):
        chunk = all_data[i:i+chunk_size]
        id_to_embedding = store_chunk(chunk,unprocessed_papers) 
        id_to_embedding = store_chunk(chunk,paper_previews) 

        for paper in papers:
            if paper.id in id_to_embedding:
                paper.preview_embeddings = id_to_embedding[paper.id]

        elapsed_time = (time.time() - start_time) / ((i + chunk_size) / chunk_size)
        remaining_texts = len(all_data) - (i + chunk_size)
        estimated_time_remaining = (elapsed_time * (remaining_texts / chunk_size)) if remaining_texts > 0 else 0

        minutes, seconds = divmod(estimated_time_remaining, 60)
        updator.SetPending(f"Processed and uploaded {i + len(chunk)}/{len(all_data)} to unprocessed vector database. Estimated time remaining: {int(minutes)}m {int(seconds)}s")
    
    updator.ReportSuccess(f"Embedded {len(all_data)}/{len(papers)} and stored unprocessed papers metadata, text and preview embeddings in the unprocessed vector database")    
     
    if len(all_data) > 0: 
        updator.DocumentProccessed(f"Processed documents: {len(paper_list_report)} to vector database",  "Uploaded research papers to vector database", "\n".join(paper_list_report))
 
    return papers

