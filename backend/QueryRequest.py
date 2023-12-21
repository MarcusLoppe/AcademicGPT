from Processor import  rank_papers_by_similarity ,PaperQueryProcessor
import Storage 
from communication.ClientUpdate import ClientUpdate 
from models.paper import Paper
from typing import List 
from communication.QuerySettings import QuerySettings
 
 
class ResearchQueryRequest: 
    
    def __init__(self, query: str,  updator: ClientUpdate, query_settings :QuerySettings):
        self.updator : ClientUpdate = updator
        self.querySettings  :QuerySettings = query_settings
        self.unprocced_research_collection = {} 
        self.query : str = query
        
        for topic in self.querySettings.Topics:
            topic.subject_embeddings = Storage.model.encode(topic.Subject).tolist()
            topic.keywords_embeddings = Storage.model.encode(topic.Keywords).tolist()   
             
        self.updator.ReportNeutral(f"Getting new research information for the query '{query}', got {len(self.querySettings.Topics)} topics to get information about")
    def query_research(self): 
        collection = None
        summary = ""
        credits= []
        if self.querySettings.CollectionProcentage > 0 and len(self.unprocced_research_collection) > 0:
            collection, papers = Storage.get_embeddings_collection(self.unprocced_research_collection.values(),  self.updator)  
            
        queryProccesor = PaperQueryProcessor(self.query, self.querySettings, self.updator) 
        try: 
            if collection is not None and self.querySettings.CollectionProcentage > 0:
                queryProccesor.query_collection(collection, self.querySettings.CollectionProcentage / 100) 
                
            if self.querySettings.CollectionProcentage < 100:
                queryProccesor.query_vectordatabase(1 - self.querySettings.CollectionProcentage / 100) 
            
            summary,credits = queryProccesor.get_results()
            
        except Exception as e:
            self.updator.ReportFailure(f"Error from query_papers: \n{e}")
            
        if collection is not None and len(collection) > 0:
            Storage.store_embedding_container(collection,  self.updator) 
            
        return summary, credits    
 
    def add_from_paper_collection(self, papers: List[Paper]):
        primaryResult = []
        self.updator.SetPending(f"Finding papers to search through from provided collection of ({len(papers)}) papers...") 
        
        for topic in self.querySettings.Topics: 
            papers = rank_papers_by_similarity(papers, topic.Keywords, topic.keywords_embeddings)   
            
            for _ in range(self.querySettings.Papers_per_topic):
                next_best_paper = next((paper for paper in papers if paper.id not in self.unprocced_research_collection), None)
                if next_best_paper:
                    primaryResult.append({ "title": next_best_paper.title , "distance" : next_best_paper.distance })
                    self.unprocced_research_collection[next_best_paper.id] = next_best_paper
                else:
                    self.updator.ReportFailure(f"Unable get find any suitable paper for subject {topic.Subject}, got papers {len(papers)}") 
                    
        sorted_data = sorted(primaryResult, key=lambda x: x['distance'])
        formatted_distance_strings = "\n".join([f"&nbsp;&nbsp;&nbsp;&nbsp;-{item['title']} Match: <b>{100 * (1 - item['distance']):.1f}%</b>" for item in sorted_data ])
        self.updator.ReportSuccess(f"Got a selection of {len(self.unprocced_research_collection)} from the provided collection of ({len(papers)}) papers.\n{formatted_distance_strings}'")  


    def add_from_unprocced_vectordatabase(self): 
        secondaryResults = [] 
        self.updator.SetPending("Getting paper previews from unprocced vector database'") 
        failures = {'already_added': 0 , 'already_embedded' : 0}
        for topic in self.querySettings.Topics:
            results = Storage.query_unprocced_papers(topic.Keywords, 20, topic.keywords_embeddings) 
            if len(results['ids']) == 0:
                self.updator.ReportFailure(f"Query to vector database for unprocced papers returned with 0 results, for: {topic.Keywords}")
                continue 
            
            start_count = len(self.unprocced_research_collection)
            for id, distance in zip(results["ids"][0], results["distances"][0]):
                if id in self.unprocced_research_collection:
                    failures["already_added"]+=1
                    continue 
                
                paper = Storage.get_paper(id, Storage.TableName.UNPROCESSED_PAPER_CACHE)   
                if paper:
                    if Storage.is_paper_embedded(id): 
                        failures["already_embedded"]+=1
                        continue
                    
                    secondaryResults.append({ "title": paper.title , "distance" : distance})
                    self.unprocced_research_collection[paper.id] = paper 
                    if len(self.unprocced_research_collection) - start_count >= self.querySettings.Papers_per_topic:
                        break
                    
            if len(self.unprocced_research_collection) == start_count:
                if failures['already_added'] + failures['already_embedded'] == len(results['ids'][0]):
                    self.updator.ReportSkipped(f"Got {len(results['ids'][0])} results from query but seems like already best candidates were already processed or embedded.\n{failures['already_added'] } already added in list, {failures['already_embedded']} was already processed") 
                else:
                    self.updator.ReportFailure(f"Got {len(results['ids'][0])} results from query but unable get find any suitable paper in unprocessed cache for subject {topic.Subject}\n{failures['already_added'] } already added in list, {failures['already_embedded']} was already processed") 
             
                     
        sorted_data = sorted(secondaryResults, key=lambda x: x['distance'])
        formatted_distance_strings = "\n".join([f"&nbsp;&nbsp;&nbsp;&nbsp;-{item['title']} Match: <b>{100 * (1 - item['distance']):.1f}%</b>" for item in sorted_data ])
        self.updator.ReportSuccess(f"Added a few papers to research collection ({len(secondaryResults)}) that existed in unprocessed database:\n{formatted_distance_strings}")       
         
    