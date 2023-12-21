from ChatAgents.ChatterBase import ChatterBase
from typing import List,Any
from Processor import PaperQueryProcessor
from communication.QuerySettings import QuerySettings 
from models.paper import Paper
import time
import Storage

class PaperChatter(ChatterBase):
    QueryContainer : List[Any]  
    
    def load_papers(self,ids) -> List[Paper]: 
        self.ClientUpdator.ReportSuccess(f"Getting searchable container for given paper ids '{ids}' ")  
        papers = []
        for id in ids:
            paper = Storage.get_paper(id,Storage.TableName.UNPROCESSED_PAPER_CACHE) or Storage.get_paper(id,Storage.TableName.PAPER_CACHE)
            if paper is not None:
                papers.append(paper) 
                    
        self.ClientUpdator.ReportSuccess(f"Got {len(papers)} of {len(ids)}, creating query container") 
        self.QueryContainer, papers = Storage.get_embeddings_collection(papers, self.ClientUpdator) 
        Storage.store_embedding_container(self.QueryContainer, self.ClientUpdator)
        self.papers = papers
        return papers
 
    def research(self, question :str, querySettings : QuerySettings):       
        querySettings.CollectionProcentage = 100
        start_time = time.time()
    
        queryProccesor = PaperQueryProcessor(question, querySettings, self.ClientUpdator) 
        queryProccesor.query_collection(self.QueryContainer, 1) 
        research_material, credits = queryProccesor.get_results()        
        self.ClientUpdator.ReportSuccess(f"Request took {round(time.time() - start_time, 1)} seconds")

        
        return research_material
