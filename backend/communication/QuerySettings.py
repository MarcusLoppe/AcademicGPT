from typing import List,Any 

class RequestedTopic:
    subject_embeddings: Any = None
    keywords_embeddings: Any = None
    def __init__(self, subject: str, keywords : str, numberOfTokens: int): 
        self.Subject = subject
        self.Keywords = keywords 
        self.numberOfTokens = numberOfTokens
    def __str__(self): 

        return (f"Subject: {self.Subject}, Keywords: {self.Keywords}, Number of Tokens: {self.numberOfTokens}")
        
class QuerySettings:
    def __init__(self, topics: List[RequestedTopic], model: str,  recentProcent: int,  formated: bool): 
        self.Topics = topics  
        self.Model = "gpt-3.5-turbo-1106" if "3.5" in model else "gpt-4-1106-preview" 
        self.MaxTokens = 12000 -500 if "3.5" in model else 128000  -500
        self.CollectionProcentage = recentProcent 
        self.Formated = formated
        self.Papers_per_topic = 2
        
    def copy(self): 
        return QuerySettings(self.Topics[:], self.Model, self.CollectionProcentage, self.Formated)

 
    @classmethod
    def from_json(cls, json_object):
        topics = [RequestedTopic(topic["subject"], topic["keywords"], topic["numberOfTokens"]) for topic in json_object["topics"]]
        return cls(topics, json_object["gptVersion"], int(json_object["recentProcentage"]), bool(json_object["formated"]))
