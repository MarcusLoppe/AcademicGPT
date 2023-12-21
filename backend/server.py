from flask import Flask 
from flask_socketio import SocketIO 
from typing import  Dict 
import Storage
from communication.QuerySettings import QuerySettings
from communication.ClientUpdate import ClientUpdate,PaperRequestType 
from ChatAgents.ExplorerChatter import ExplorerChatter 
from ChatAgents.PaperChatter import PaperChatter 
from ChatAgents.AgentChatter import AgentChatter 
from ChatAgents.ChatterBase import ChatterBase, ChatterMode

app = Flask(__name__)  
socketio = SocketIO(app, cors_allowed_origins="*") 
clientUpdators: Dict[str, ClientUpdate] = {}
clientResearcher: Dict[str, ChatterBase] = {}

def getClient(message):
    if "sid" not in message:
        return
    
    sid = message["sid"]
    if sid not in clientUpdators: 
        clientUpdators[sid] =  ClientUpdate(socketio, sid) 
    updater = clientUpdators[sid] 
     
    if sid not in clientResearcher or clientResearcher[sid] is None: 
        clientResearcher[sid] = ExplorerChatter(updater) 
        
    if "requestPage" in message:
        chatter_mode = ChatterMode(message["requestPage"]) 
        
        match chatter_mode:
            case ChatterMode.PaperChatter: 
                if not isinstance(clientResearcher[sid], PaperChatter): 
                    clientResearcher[sid]  = PaperChatter(updater)   
            case ChatterMode.ExplorerChatter:
                if not isinstance(clientResearcher[sid], ExplorerChatter): 
                    clientResearcher[sid] = ExplorerChatter(updater) 
            case ChatterMode.AgentChatter: 
                if not isinstance(clientResearcher[sid], AgentChatter): 
                    clientResearcher[sid]  = AgentChatter(updater)   
        
        
    return clientUpdators[sid] , clientResearcher[sid]

@socketio.on('left chat')
def handle_leave_chat(message):  
    if "sid" in message:
        clientResearcher[message["sid"]] = None
        
@socketio.on('user feedback')
def handle_message(message):
    if "sid" not in message:
        return
    updater, researcher = getClient(message) 
    
    if researcher.chat_active:
        updater.FunctionChatResponse("handle_message", f"question {message['question']}")
        updater.message_queue.put(message['question'])
    else:
        researcher.start_conversation(message['question'], message["embeddPapers"])
                                  
@socketio.on('hyde question')
def get_hyde(message):    
    updater, researcher = getClient(message)  
    question = message["question"]
    print(question)
    if question == "":
        question = 'what machine learning model architecture type has highest accuracy to detect malware?'
        
    hydeResult =  researcher.get_hyde(question)
    text = '\n'.join([f"{item[0]}\n{item[1]}" for item in hydeResult])
    updater.SendTopics({"type": "question", "topics" :[ {question : text} ] })       
                              
@socketio.on('query subject')
def query_subject(message):    
    if "sid" not in message:
        return
    updater, researcher = getClient(message)  
    subject = message["subject"]
    size = message["size"] 
    papers =  researcher.query_subject(subject,size)
    results = [{'id': paper.id, 'title': paper.title, 'text': paper.abstract, 'date': paper.date} for paper in papers]  
    
    updater.SendPacket("paper subject query", results) 
     
@socketio.on('query topics')
def get_topics(message):    
    if "sid" not in message:
        return
    updater, researcher = getClient(message)  
    subject = message["subject"]
    size = message["size"]
    
    topics =  researcher.get_topics(subject,size)
    updater.SendTopics({"type": "query", "topics" : topics})
    
@socketio.on('embedd papers')
def embedd_papers(message):     
    if "sid" not in message:
        return
    updater, researcher = getClient(message)
    papers = []
    
    for id in message["ids"]:
        paper = Storage.get_paper(id,Storage.TableName.UNPROCESSED_PAPER_CACHE)
        if paper is not None:
            papers.append(paper) 
       
    collection, papers = Storage.get_embeddings_collection(papers, updater)
    Storage.store_embedding_container(collection, updater)  
         
@socketio.on('get all papers')
def get_papers(message):    
    if "sid" not in message:
        return 
    updater, researcher = getClient(message)  
    request_type = PaperRequestType.from_value(message["type"])
    papers = [] 
    if request_type in [PaperRequestType.Processed, PaperRequestType.All]:
        processed_papers = Storage.get_all_papers(Storage.TableName.PAPER_CACHE)
        ids = [paper.id + "_1" for paper in processed_papers]
        query = Storage.pdf_collection.get(ids = ids)
        processed_papers = [paper for paper in processed_papers if paper.id + "_1" in query["ids"]]
        papers.extend(processed_papers)

    if request_type in [PaperRequestType.Unprocessed, PaperRequestType.All]:
        unprocessed_papers = Storage.get_all_papers(Storage.TableName.UNPROCESSED_PAPER_CACHE)
        papers.extend(unprocessed_papers)
 
    unique_papers = {paper.id: paper for paper in papers}.values()  
    def is_valid(value):
        return value not in ['', None, 'None']
 
    results ={
        "paperRequestType" : message["type"],
        "papers" : [ 
            {'id': paper.id, 'title': paper.title, 'text': paper.abstract, 'date': paper.date}
            for paper in unique_papers
            if all(is_valid(getattr(paper, attr)) for attr in ['id', 'title', 'abstract', 'date'])
        ]
    }
    
    print(len(results)) 
    updater.SendPacket("paper results", results) 
    
@socketio.on('query embeddings')
def query_proccessed_papers(message):  
    if "sid" not in message:
        return
    updater, researcher = getClient(message)  
    request_type = PaperRequestType.from_value(message["type"]) 
  
    queryResult = {}  
    if request_type  == PaperRequestType.All:
        processed = Storage.query_previews(message["query"], message["k"]) 
        for id, distance in zip(processed["ids"][0], processed["distances"][0]):
            paper = Storage.get_paper(id.split("_")[0], Storage.TableName.PAPER_CACHE) or Storage.get_paper(id.split("_")[0], Storage.TableName.UNPROCESSED_PAPER_CACHE)
            queryResult.update({id.split("_")[0]: {'distance': distance, 'paper': paper}}) 
    else:
        if request_type == PaperRequestType.Processed:
            processed = Storage.query_papers(message["query"], message["k"])
            queryResult.update({id.split("_")[0]: {'distance': distance, 'paper': Storage.get_paper(id.split("_")[0], Storage.TableName.PAPER_CACHE)} for id, distance in zip(processed["ids"][0], processed["distances"][0]) if id.split("_")[0] not in queryResult})

        if request_type == PaperRequestType.Unprocessed: 
            unprocessed = Storage.query_unprocced_papers(message["query"], message["k"])
            queryResult.update({id.split("_")[0]: {'distance': distance, 'paper': Storage.get_paper(id.split("_")[0], Storage.TableName.UNPROCESSED_PAPER_CACHE)} for id, distance in zip(unprocessed["ids"][0], unprocessed["distances"][0]) if id.split("_")[0] not in queryResult})
    
                 
    results= []  
    for id, data in sorted(queryResult.items(), key=lambda x: x[1]['distance']):
        paper = data['paper']
        distance = data['distance'] 
        if paper is not None and paper.id != "None":
            results.append({
                'id': paper.id, 
                'title': f"{paper.title}      ({100 * (1 - float(distance)):.1f}%)", 
                'text': paper.abstract, 
                'date': paper.date
            }) 
    
    results ={
        "paperRequestType" : message["type"],
        "papers" : results
    }
           
    updater.SendPacket("paper results", results)
 
@socketio.on('export papers')
def export_request(message):     
    if "sid" not in message:
        return
    updater, researcher = getClient(message)  
    ids = message["ids"]  
    
    updater.SetPending("Getting papers from database...")
    
    papers = Storage.get_all_papers(Storage.TableName.PAPER_CACHE)
    unprocessed_papers = Storage.get_all_papers(Storage.TableName.UNPROCESSED_PAPER_CACHE)
    
    updater.ReportSuccess(f"Got {len(papers)} papers from paper cache & {len(unprocessed_papers)} from unprocced paper cache")
    papers.extend(unprocessed_papers)  
      
 
    unique_papers = {paper.id: paper for paper in papers if paper.id in ids}.values()
    updater.SetPending(f"Removed duplicates and procceding {len(unique_papers)} papers for download request")
    
    results = [{'id': paper.id, 
                'title': paper.title,
                'authors': paper.authors, 
                'abstract': paper.abstract, 
                'fullText': Storage.insert_headline_seperation(paper.fullText),
                'date': paper.date} 
                for paper in unique_papers]
    
    updater.SetPending(f"Sending {len(results)} papers for download request ")
    updater.SendPacket("download request", results)   
    updater.ReportSuccess(f"Sent {len(results)} papers for download request ")
         
 
    
     
@socketio.on('start chat')
def start_chat(message):    
    if "sid" not in message:
        return
      
    updater, researcher = getClient(message) 
    type_value = message["requestPage"]
    chatter_mode = ChatterMode(type_value)
    
    match chatter_mode:
        case ChatterMode.PaperChatter:  
            clientResearcher[message['sid']] = researcher
            researcher.query_settings = QuerySettings([], message["data"]["gptVersion"], 100, False)
            
            loadedPapers = researcher.load_papers(message["data"]["ids"])
            titles =[f"<b>{paper.title}</b>" for paper in loadedPapers]
            
            updater.ConversationChatResponse("Ready to chat", 'Succesfully loaded ' + str(len(loadedPapers)) + ' papers:\n\n' +  '\n'.join(titles))
            updater.SendPacket('user feedback required', "What would like to like to know about the papers?" ) 
            
        case ChatterMode.ExplorerChatter:
            clientResearcher[message['sid']]  = researcher 
            researcher.start_research(message["data"]["subject"], message["data"])  
            
        case ChatterMode.AgentChatter:                 
            clientResearcher[message['sid']] = researcher
            researcher.query_settings = QuerySettings([], message["data"]["gptVersion"], 0, False) 
            
            updater, researcher = getClient(message) 
            updater.ConversationChatResponse("Ready to chat", "What would like to know?")
            updater.SendPacket('user feedback required', "Any questions on your mind?" ) 
         
     
if __name__ == '__main__':  
    socketio.run(app,host="0.0.0.0", port=5050, debug=True,use_reloader=False) 
    

     