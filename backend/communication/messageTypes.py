
from enum import Enum 

class DetailsType(Enum):
    Document_Reference = 1
    Document_Summarization = 2  

class CardType(Enum):
    FunctionCall = 1
    Converstation = 2

class TimelineItemState(Enum):
    Success = 1
    Failure = 2
    Skipped = 3

class ChatResponse:
    def __init__(self, Type: CardType, Title: str,  Content: str): 
        self.Type = Type.value
        self.Title = Title 
        self.Content = Content

    def to_json(self):
        return {
            "Type": self.Type,
            "Title": self.Title, 
            "Content": self.Content
        }
  
class DetailsItem:
    def __init__(self, Type: DetailsType, Title: str, Description: str, Content: str):
        self.Type = Type.value
        self.Title = Title
        self.Description = Description
        self.Content = Content 
    def to_json(self):
        return {
            "Type": self.Type,
            "Title": self.Title,
            "Description": self.Description,
            "Content": self.Content
        }
 