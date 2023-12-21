
from enum import Enum 
import queue,time
from flask_socketio import SocketIO 

class PaperRequestType(Enum):
    Processed = 1
    Unprocessed = 2
    All = 3

    @staticmethod
    def from_value(value):
        for name, member in PaperRequestType.__members__.items():
            if member.value == value:
                return member
        raise ValueError(f"No matching PaperRequestType for value: {value}")


class DetailsType(Enum):
    Document_Reference = 1
    Document_ResearchMaterial = 2
    Document_Proccessed = 3

class CardType(Enum):
    FunctionCall = 1
    Converstation = 2

class TimelineItemState(Enum):
    Success = 1
    Failure = 2
    Skipped = 3
    Neutral = 4

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
        

        
class ClientUpdate:
    message_queue = queue.Queue()  

    def __init__(self, socket: SocketIO, id: str):
        self.socketio = socket
        self.sid = id
 
    def SendPacket(self, event, data): 
        self.socketio.emit(event, data ,to=self.sid) 
        
    def SendTopics(self, topic_json): 
        self.socketio.emit('topic event' , topic_json,to=self.sid) 
          
    def PromptUser(self, prompt: str):
        self.ConversationChatResponse("Question to user:", prompt) 
        self.socketio.emit('user feedback required',"Waiting for reply" , to=self.sid) 
        
        print("get_human_input")   
        user_message =""
        while(user_message == ""):
            try:
                user_message = self.message_queue.get(timeout=10)  # wait 10 seconds
            except queue.Empty: 
                pass
        print("="*50)
        print(user_message)  
        print("="*50) 
        return user_message
    
    def ConversationChatResponse(self, Title: str,  Content: str):
        self._chatResponse(CardType.Converstation, Title ,Content)  

    def FunctionChatResponse(self, Title: str,  Content: str):
        self._chatResponse(CardType.FunctionCall, Title ,Content)   

    def _chatResponse(self, cardType: CardType, Title: str,  Content: str):
        if Title is None or Title == "":
            Title = "N/A"
        if Content is None or Content == "":
            Content = "N/A"
        response = ChatResponse(cardType, Title ,Content) 
        self.socketio.emit('chat response' , response.to_json(),to=self.sid) 
 
    def DocumentResearchMaterial(self, Title: str,  Description: str,  Content: str): 
        self._documentEvent(DetailsType.Document_ResearchMaterial, Title, Description, Content)  

    def DocumentProccessed(self, Title: str,  Description: str,  Content: str): 
        self._documentEvent(DetailsType.Document_Proccessed, Title, Description, Content)  

    def DocumentReference(self, Title: str,  Description: str,  Content: str): 
        self._documentEvent(DetailsType.Document_Reference, Title, Description, Content)  

    def _documentEvent(self, detailsType : DetailsType, Title: str,  Description: str,  Content: str): 
        eventDetails = DetailsItem(detailsType, Title, Description, Content) 
        self.socketio.emit('details event' , eventDetails.to_json(),to=self.sid) 


    def SetLoadingDone(self):   
        self.socketio.emit('chat loading done' , to=self.sid) 

    def SetPending(self, Content: str, fast = False):  
        if fast == False:
            time.sleep(0.2)
        timelineResult = { "Content": Content}
        self.socketio.emit('timeline pending' , timelineResult, to=self.sid) 

    def ReportSuccess(self,  Content: str):   
        self._timelineResult(TimelineItemState.Success, Content)

    def ReportFailure(self,  Content: str):   
        self._timelineResult(TimelineItemState.Failure, Content)

    def ReportSkipped(self,  Content: str):   
        self._timelineResult(TimelineItemState.Skipped, Content)

    def ReportNeutral(self,  Content: str):   
        self._timelineResult(TimelineItemState.Neutral, Content)


    def _timelineResult(self,  result : TimelineItemState,  Content: str): 
        timelineResult = { "State": result.value,  "Content":Content}
        self.socketio.emit('timeline' , timelineResult, to=self.sid) 
         