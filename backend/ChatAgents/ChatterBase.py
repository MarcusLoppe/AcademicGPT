from communication.ClientUpdate import ClientUpdate   
import json
from autogen import config_list_from_json,oai 
from ExtenedAgents import ExtendedAssistantAgent,ExtendedUserProxyAgent
from models.paper import Paper
from typing import List
import enum
import openai
from communication.QuerySettings import QuerySettings, RequestedTopic 
from core_research_provider import query_API_subject
config_list = config_list_from_json(env_or_file="OAI_CONFIG_LIST") 
openai.api_key= config_list[0]["api_key"]    

class ChatterMode(enum.Enum): 
    ExplorerChatter = 0
    PaperChatter = 1
    AgentChatter = 2
      
class ChatterBase():     
    def __init__(self,  updater: ClientUpdate):
        self.ClientUpdator = updater  
        self.conversation_history: List[str] = []
        self.chat_active: bool = False 
        self.subject: str = ''    
        self.credits: str = ''  
        self.research_material: str = ''   
        self.query_settings: QuerySettings = QuerySettings([], "3.5", 50, False)
        self.papers: List[Paper] = []   
        self.embedd_papers: bool = True
        
    def get_hyde(self, question):
        
        example = """ {
  "answers": [
    { "title": "...",
      "answer_text": "...",
    },
    { "title": "...",
      "answer_text": "...",
    },
...""" 
        prompt = f"""Given the search query "{question}", generate 4 different answers that explore various possibilities relevant to the query.
Recognize that some questions may have multiple valid answers depending on specific circumstances or types.
The text of the answer should have the style and content of what might can be found in a research paper, ensure to include specific metrics, percentages, or comparative figures if applicable.

Your response should be in JSON format as per example:
EXAMPLE:
{example}

QUERY:
{question}

DIFFERENTIATED ANSWERS:
"""
        self.ClientUpdator.SetPending(f"Generating vector search keywords for question {question} ..")  
        response = oai.ChatCompletion.create(
                model="gpt-3.5-turbo-1106",
                response_format={ "type": "json_object" },
                messages=[ {"role": "system", "content": prompt} ] )
        
        output = response['choices'][0]['message']['content']
        responseJson = json.loads(output)  
        list_key = responseJson[next(iter(responseJson))] 
        print(output)
        
        extracted_data = []
        for item in list_key:
            values = list(item.values()) 
           
            if len(values) >= 2:
                extracted_data.append((values[0], values[1])) 
                print(f"{values[0]}\n{values[1]}")
            if len(values) == 1:
                extracted_data.append((question, values[0])) 
                print(f"{values[0]}")
                
        self.ClientUpdator.ReportSuccess("Generated vector search keywords!:\n" + '\n\n'.join([f"<b>{item[0]}</b>\n{item[1]}" for item in extracted_data])) 
        return extracted_data
        
    def get_topics(self,subject,size):
        self.subject = subject 
        self.research_material= "" 
        
        self.query_subject(subject,size) 
        if len(self.papers) == 0:
            self.ClientUpdator.ReportFailure("Unable to get papers")
            return []
        
        self.ClientUpdator.SetPending("Asking ChatGPT API for topic suggestions using the titles from the query..")
        titles = "\n".join([paper.title for paper in self.papers[:50]]) 
        
        example =   """Areas of interest": [
{ "Adversarial Attacks on Malware Detection Models" : "Adversarial attacks refer to the techniques used to deceive or trick machine learning models into misclassifying..."},
{ "Malware Classification using Graph Neural Networks" : "Graph neural networks (GNNs) offer a unique approach to classifying and analyzing the structural relationships ... "},
...
]"""
        prompt = f""""Considering the topic '{subject}' and the titles listed below:
{titles}

You have been given the task of helping a researcher staying up to date with the latest research on the subject '{subject}', they'll need a list of interesting things a subarea and directly related to the subject '{subject}', ONLY list things that are a subarea and directly related of the subject.
Using the titles and the topic that the researcher is interested in '{subject}; think of 10 areas that the researcher might be interested in.
Output in a JSON format, each object should contain the area and have the value should be a expanded text of example text which would be contained in research papers including related terms, synonyms, and broader context.

Format example:
{example}"""


        request = oai.ChatCompletion.create(
                response_format={ "type": "json_object" },
                model="gpt-3.5-turbo-1106",
                messages=[ {"role": "user", "content": prompt} ] )
            
        response = request['choices'][0]['message']['content'] 
        
        self.ClientUpdator.ReportSuccess("Got response from ChatGPT about topics!") 
        ret = [] 
        responseJson = json.loads(response)  
            
        print("responseJson")
        print(responseJson)
        list_key = next(iter(responseJson))  
        
        for area_dict in responseJson[list_key]:  
            for key, value in area_dict.items():  
                ret.append({  key : value}) 
                 
        return ret
               
    def query_subject(self,subject:str, size:int):
        self.subject = subject   
        self.papers  = query_API_subject(self.ClientUpdator, subject, size)  
        return self.papers 
    
    def research_request(self, question):   
        hydeResponse = self.get_hyde(question) 
        self.ClientUpdator.SetPending(f"Processing request of information request for question: {question}, created alternative-hyde-response for better search results...")   
         
        topics = [RequestedTopic(topic[0], topic[1], 2000) for topic in hydeResponse]  
        querySettings = self.query_settings.copy()
        querySettings.Topics = topics 
        return self.research(question, querySettings) 
                
    def research(self, question:str, querySettings : QuerySettings):    
        raise NotImplementedError("Subclass must implement this method")

    def start_conversation(self, query, embedd_papers : bool):  
        self.embedd_papers = embedd_papers
        llm_config_researcher = {
            "functions": [
                    {
                    "name": "research",
                    "description": "database search by asking a question",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "question": {
                                "type": "string",
                                "description": "input a question and get information!",
                            } 
                        },
                        "required": ["question"],
                    }
                } 
            ],
            "config_list": config_list}    
        self.chat_active = True
        
        researcher = ExtendedAssistantAgent(
            updater = self.ClientUpdator,
            name="researcher",
            system_message = 
            """You are a helpful assistant that will answer all the users questions based on verified facts from the research database.
- Include all inline citations or paper titles for reference, the paper title must be included.
- Prioritize specific evidence and quantitative data points from the text to validate claims.

Call the research function until you can provide the user with a complete answer to the user, if you have not gathered enough information, try paraphrasing the question differently and call the research function again.
When you no longer need to search for more information; add TERMINATE at the end of your message.
""",
            llm_config=llm_config_researcher,
        )
        #When you no longer need to search for more information; add TERMINATE at the end of your message.
        user_proxy = ExtendedUserProxyAgent(
            updater = self.ClientUpdator,
            name="User_proxy",   
            is_termination_msg=lambda x: x.get("content", "") and x.get(   "content", "").rstrip().endswith("TERMINATE"), 
            human_input_mode="NEVER", 
            function_map={ 
                "research" : lambda **kwargs:  self.research_request(**kwargs), 
            }
        )
        
        if len(self.conversation_history) > 0:
            history = "\n\n".join(self.conversation_history)
            promptMessage = history +  f"\n\n Using the previous chat history provided above and using the research function to search database for new information; answer the users question: {query}"
        else:
            promptMessage = f"""Using the research function to search database for new information; answer the users question: {query}"""
            
        promptMessage += """
When replying to user remember:
- Include quantitative data points from the research for validation.
- Emphasize specific metrics, percentages, or comparative figures where available to substantiate claims.
- Include all inline citations or paper titles for reference, do not use [1] or similar, the paper title must be included.
- Prioritize specific evidence and quantitative data points from the text to validate claims."""
            
        user_proxy.initiate_chat(researcher, message=promptMessage) 
        user_proxy.stop_reply_at_receive(researcher) 
           
        self.conversation_history.append(f"User: {query}")
        self.conversation_history.append('Agent: ' + user_proxy.last_message()["content"])
         
        self.ClientUpdator.SendPacket('user feedback required', "Any other questions on your mind?" ) 
        
        self.chat_active = False
