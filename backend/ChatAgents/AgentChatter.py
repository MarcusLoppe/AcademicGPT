from ChatAgents.ChatterBase import ChatterBase 
from typing import List,Any
from communication.QuerySettings import QuerySettings
from QueryRequest import ResearchQueryRequest
import time

class AgentChatter(ChatterBase):
    QueryContainer : List[Any]   
    
    def research(self, question :str, querySettings : QuerySettings): 
        querySettings.CollectionProcentage = 0 
        querySettings.Papers_per_topic = 1 if len(querySettings.Topics) > 2 else 2
        
        start_time = time.time()
        researchQuery = ResearchQueryRequest(question, self.ClientUpdator, querySettings) 
        if self.embedd_papers:
            researchQuery.add_from_unprocced_vectordatabase()
        research_material, credits, self.numbered_credits = researchQuery.query_research() 
       
        self.ClientUpdator.ReportSuccess(f"Request took {round(time.time() - start_time, 1)} seconds")
        return research_material
     