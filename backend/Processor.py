from communication.ClientUpdate import ClientUpdate 
import numpy as np   
import tiktoken
import Storage  
from typing import List,Set,Dict,Any
from communication.QuerySettings import QuerySettings, RequestedTopic
from models.paper import Paper 
from utils.textTools import split_on_references 
from utils.referenced_document import Document, ReferenceManager 

def format_resultArray(primaryResult): 
    for result in primaryResult:
        result['avgDistance'] = sum(result['distances']) / len(result['distances'])
        result['distances'].sort()     

    primaryResult = sorted(primaryResult, key=lambda x: x['avgDistance'])
    formatted_distance_strings = "\n".join(
        [f"&nbsp;&nbsp;&nbsp;&nbsp;-{item['title']} Tokens <b>{item['tokens']}</b> Average match: <b>{100 * (1 - item['avgDistance']):.1f}%</b>  [{', '.join(f'<b>{100 * (1 - d):.1f}%</b>' for d in item['distances'])}]" 
        for item in primaryResult]
    )  
    return formatted_distance_strings


class PaperQueryProcessor: 
    def __init__(self, query:str,  querySettings: QuerySettings, updator: ClientUpdate):
        self.querySettings : QuerySettings = querySettings
        self.updator : ClientUpdate = updator
        self.text_manager = ReferenceManager()
        self.encoder = tiktoken.get_encoding("cl100k_base") 
        self.query : str = query   
          
        self.used_ids: List[str] = []   
        self.credit_list: Set[str] = set()   
        self.areas_tokens: Dict[str, int] = {}    
        self.collection = Any
        self.log = []
        
        for topic in querySettings.Topics: 
            if topic.keywords_embeddings is None:
                topic.keywords_embeddings = Storage.model.encode(topic.Keywords).tolist()    
            print(topic)
             
        self.updator.SetPending(f"Collecting research, please wait...")

    def process_data(self, collection_fetcher,  tokenProcentage: float):
        self.updator.SetPending("Processing collection...'")
        results = []  
        
        for topic in self.querySettings.Topics: 
            currentMgr = ReferenceManager()
            currentResearchSize = len(self.encoder.encode(self.text_manager.compile_documents()))
            oldLength = 0
            collection = collection_fetcher(self, topic)  
            
            for id, document, distance in [(item['id'], item['text'], item['distance']) for item in collection if item['id'] not in self.text_manager.ids]:
                paper_id = id.split('_')[0] 
                paper = Storage.get_paper(paper_id, Storage.TableName.UNPROCESSED_PAPER_CACHE) or Storage.get_paper(paper_id, Storage.TableName.PAPER_CACHE)
                if paper is None: 
                    continue 
                
                text, references = split_on_references(document)
                if len(text) < 100:
                    continue 
                 
                currLength = len(self.encoder.encode(currentMgr.preview_complied(Document(text, id, paper))))
                
                if currLength > topic.numberOfTokens * tokenProcentage: 
                    continue 
                if currentResearchSize + currLength > self.querySettings.MaxTokens: 
                    return format_resultArray(results)
                
                self.text_manager.add_document(Document(text, id, paper))
                currentMgr.add_document(Document(text, id, paper)) 
                
                newTokenLength = currLength-oldLength
                self.areas_tokens[topic.Subject] = self.areas_tokens.get(topic.Subject, 0) + newTokenLength
                self.updator.DocumentReference(f"{paper.title} ID: {paper.id} (part: {id.split('_')[1]}) Distance: {100 * (1 -float(distance)):.1f}%", f"{paper.title}",text)  
                
                oldLength = currLength
                result = next((r for r in results if r['title'] == paper.title), None)  
                if result is not None:
                    result['distances'].append(float(distance))
                    result['tokens'] += newTokenLength
                else:
                    results.append({ "title": paper.title, "distances": [float(distance)], "tokens": newTokenLength  })    

        return format_resultArray(results) 
    
    def query_collection(self, collection, collectionProcentage: float): 
        self.collection = collection 
        recentResults = self.process_data(query_collection, collectionProcentage)
        
        textLength = len(self.encoder.encode(self.text_manager.compile_documents())) 
        if textLength > 0:
            self.updator.ReportSuccess(f"Got {textLength} tokens from the provided container data, sources and matching statistics: \n\n{recentResults}'")   
        else: 
            self.updator.ReportFailure("Unable to find any information the provided container..'")   
        
        
    def query_vectordatabase(self, collectionProcentage: float): 
        textLength = len(self.encoder.encode(self.text_manager.compile_documents())) 
        if textLength < self.querySettings.MaxTokens: 
            foundationResults =  self.process_data(query_vectordatabase, collectionProcentage ) 
            newSize = len(self.encoder.encode(self.text_manager.compile_documents())) 
            
            if newSize == textLength:
                self.updator.ReportSkipped("Found no relevant papers in vector database")
            else:
                self.updator.ReportSuccess(f"Got {(len(self.encoder.encode(self.text_manager.compile_documents()))-textLength)} tokens from existing data in vector database, sources:\n\n{foundationResults}'")  
            textLength = newSize
              
        
    def get_results(self):     
        textLength = len(self.encoder.encode(self.text_manager.compile_documents()))  
        self.updator.DocumentResearchMaterial(f"Query: {self.query}", f"Returning information from '{self.query}', got <b>{textLength}</b> tokens", self.text_manager.compile_documents())
        
        tokenSplit = "\n".join([f"&nbsp;&nbsp;&nbsp;&nbsp;- <b>{key}:</b> {value} tokens." for key, value in self.areas_tokens.items()])
        self.updator.ReportSuccess(f'Returning with {textLength} tokens, token split per area:\n {tokenSplit}')  
        
        return self.text_manager.compile_documents(), self.text_manager.get_paper_credits(), self.text_manager.last_references
  
 
def query_vectordatabase(self : PaperQueryProcessor, topic : RequestedTopic):
    queryResult = Storage.query_papers(topic.Keywords, 20, topic.keywords_embeddings)  
    return [{'id': id, 'text': document, 'distance': distance} for id, document, distance in zip(queryResult["ids"][0], queryResult["documents"][0], queryResult["distances"][0])]

def query_collection(self: PaperQueryProcessor, topic : RequestedTopic):
    return rank_collection_similarity(self.collection, topic.keywords_embeddings) 
   
   
def cosine_similarity(A, B):
    dot_product = np.dot(A, B)
    norm_A = np.linalg.norm(A)      
    norm_B = np.linalg.norm(B)
    return dot_product / (norm_A * norm_B)

def rank_papers_by_similarity(papers: List[Paper], subject, objective_embedding = None ) ->  List[Paper]:
    if objective_embedding is None: 
        objective_embedding = Storage.model.encode(subject)   
  
    def compute_similarity(paper: Paper): 
        content_embedding = paper.embeddings or paper.preview_embeddings 
        sim = cosine_similarity(objective_embedding, content_embedding)  
        paper.distance = float(sim)
        return sim
 
    sorted_papers = sorted(papers, key=compute_similarity, reverse=True) 
    return sorted_papers

def rank_collection_similarity(collection, embedding ):   
    def compute_similarity(item):
        content_embedding = item.get("embedding")
        item["distance"] = cosine_similarity(embedding, content_embedding)
        return item["distance"]
 
    sorted_collection = sorted(collection, key=compute_similarity, reverse=True) 
    return sorted_collection