import requests
import json    
import Processor, Storage
from communication.ClientUpdate import ClientUpdate
from dateutil.parser import parse  
from typing import List 
from models.paper import Paper
import time

CORE_API_URL = "https://api.core.ac.uk/v3/search/works"
API_KEY = "XXX"  

headers = {
    "Authorization": f"Bearer {API_KEY}"
}


def query_API_subject(updator: ClientUpdate, subject, size: int):  
    updator.ReportSuccess(f"Getting new research information using search keyword '{subject}' ")  
    papers = None 
    for _ in range(3):
        try: 
            papers = query_core_api(subject,updator,size)
        except Exception as e: 
            updator.ReportFailure(f"Failed getting new information, error message: {e}")    
                
        if papers is None:
            updator.ReportFailure("Failed getting new information,waiting for 2 seconds before retrying...")
            time.sleep(2)
            try: 
                papers = query_core_api(subject,updator,size)
            except Exception as e: 
                updator.ReportFailure(f"Failed getting new information, error message: {e}")    
                
            if papers is None:
                updator.ReportFailure("Failed getting new information,waiting for 10 seconds before retrying...")
                time.sleep(10)
        else:
            break 
    updator.ReportSuccess(f"Got {len(papers)} papers from the subject '{subject}'")  
    return papers

def process_results(results, subject, updator: ClientUpdate):  
    papers = results_to_papers(results,updator)
    updator.SetPending(f"Ranking the papers and storing embeddings for top 50 papers") 
    Storage.store_unprocced_papers(papers, updator)
    papers = Processor.rank_papers_by_similarity(papers, subject) 
  
    updator.ReportSuccess(f"Ranked research papers ({len(papers)})")
    return papers
  
def results_to_papers(results, updator: ClientUpdate):
    num_results = len(results.get('results', []))
    updator.SetPending(f"Converting results from CORE API query: 0/{num_results} to paper objects")

    papers: List[Paper] = []
    items_done = set() 
    for idx, res in enumerate(results["results"], 1):
        if idx % 50 == 0:
            updator.SetPending(f"Converting results from CORE API query: {idx}/{num_results} to paper objects", True)

        paper_id = res.get("doi")
        if paper_id is None or paper_id == "None" or paper_id == "":
            paper_id = res.get("id")
            
        if paper_id is not None: 
            paper_id = str(paper_id).replace("/", "")
        
        if paper_id in items_done :
            continue 
        if not res.get("fullText") or len(res.get("fullText", "")) < 100:
            continue
        
        if not res.get("abstract") or len(res.get("abstract", "")) < 25:
            continue
        
        if paper_id == "" or paper_id is None or paper_id == "None":
            continue
        
        if res.get("language") and res["language"].get("name", "").lower() != "english":
            continue
        
        
        date = res.get("yearPublished")
        if not date:
            date = parse(res.get("publishedDate", "")).year if res.get("publishedDate") else None

        papers.append(Paper(
            paper_id, 
            str(res.get("doi", "")),
            date,
            ' '.join([author['name'] for author in res.get('authors', [])]),
            ' '.join(res.get("title", "").replace("\n","").split()),
            res.get("abstract", ""),
            res.get("downloadUrl", ""),
            res.get("fullText", "")
        )) 
        items_done.add(paper_id)
        
    updator.ReportSuccess(f"Procceded results from CORE API, got {len(papers)} papers out of {num_results} items. Some might be duplicates or removed by filter")#\n{formatted_string}")
    return papers
  
def query_core_api(query, updator: ClientUpdate, size:int):   
    updator.SetPending(f"Querying the CORE API using the search keywords: {query}") 
        
    params = {
        "q": query,
        "sort": "recency",
        "limit" : size
    } 
    param_string =  json.dumps(params, indent=4)
    cached_result = Storage.get_api_cache(param_string)

    if cached_result:
        print("[CORE-API] Using cached repsonse") 
        results = json.loads(cached_result[0][0])
        if "results" in results:
            updator.ReportSkipped("Using cached response from the CORE API")
            sorted_results = process_results(results,query,updator)
            return sorted_results 
        else: 
            updator.ReportSkipped("Seems like cached response from the CORE API doesnt contain any results") 

    updator.SetPending(f"Sending request to the CORE API using the search keywords: {query}") 
    response = requests.get(CORE_API_URL, params=params)
    updator.SetPending(f"Request sent to the CORE API using the search keywords: {query}") 
 
    result = response.json() 
    print("[CORE-API] query_core_api, X-RateLimit-Remaining: " + str(response.headers.get("X-RateLimit-Remaining", "unknown"))) 

    byte_size = len(response.content)   
    mb_size = byte_size / (1024 * 1024) 
    print(f"[CORE-API] Response size: {mb_size:.2f} MB") 
    if mb_size < 1:
        print(params)
        print("="*50)
        print(response.content)
        updator.ReportFailure(f"Failure to query API, response size: {mb_size:.2f} MB response:\n{response.content}") 
        return  None
        
    updator.ReportSuccess(f"Got {result.get('totalHits','')} hits but limited {result.get('limit','')}, response size: {mb_size:.2f} MB")

    Storage.insert_api_cache(param_string,result) 
    sorted_results = process_results(result,query,updator)
    return sorted_results  
 
 