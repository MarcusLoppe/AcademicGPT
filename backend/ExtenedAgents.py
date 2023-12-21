from communication.ClientUpdate import ClientUpdate 
from typing import Any, Callable, Dict, List, Optional, Tuple, Type, Union
from autogen import config_list_from_json,Agent,oai
import autogen

class ChatMixin:  
    Updater: Optional[ClientUpdate] = None

    def __init__(self, *args, **kwargs):   
        self.Updater = kwargs.pop('updater', None) 
        super().__init__(*args, **kwargs)  

         

    def get_human_input(self, prompt: str) -> str:   
        user_message = self.Updater.PromptUser(prompt)
        print("get_human_input returning " + str(user_message)) 
        return user_message
  
    def _print_received_message(self, message: Union[Dict, str], sender: Agent):
        if sender is not None and self is not None:          
            title = f"{sender.name} to {self.name}" 
        else:
            title = f"{self.name}" 

        if message.get("role") == "function":
            title = f'Response from calling function: "{message["name"]}"'
            if len(message["content"]) > 1000:
                self.Updater.ConversationChatResponse(title, "Limited amount of data to display. See 'View research details'->'Research Materials' tab for full text. \n\n <i>" + str(message["content"][:500]) + "</i>")
            else:
                self.Updater.ConversationChatResponse(title, message["content"])
        else:
            content = message.get("content")
            if content is not None:  
                self.Updater.ConversationChatResponse(title, content)
                if "context" in message:
                    content = oai.ChatCompletion.instantiate(
                        content,
                        message["context"],
                        self.llm_config and self.llm_config.get("allow_format_str_template", False),
                    ) 
                return
            if "function_call" in message: 
                msg =  f"Suggested function Call: {message['function_call'].get('name', '(No function name found)')}\n Arguments: \n"+   message["function_call"].get("arguments", "(No arguments found)")
                self.Updater.FunctionChatResponse(title,msg)     

 
class ExtendedAssistantAgent(ChatMixin, autogen.AssistantAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)  
class ExtendedUserGroupChat(ChatMixin, autogen.GroupChat):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)  
class ExtendedUserGroupChatManager(ChatMixin, autogen.GroupChatManager):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)  
class ExtendedUserProxyAgent(ChatMixin, autogen.UserProxyAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)    
 