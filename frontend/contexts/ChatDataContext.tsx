import React, { createContext, useState, useContext, ReactNode } from 'react';
 
export enum  ChatType
{ 
  Explorer = 0,
  PaperChatter = 1,
  AgentChatter = 2
}
export type ChatTopic = {
    subject: string;
    keywords: string; 
    isUserGenerated: boolean;
    numberOfTokens: number
} 
export class BaseChatRequestData {
  gptVersion: string;

  constructor(gptVersion: string) {
    this.gptVersion = gptVersion;
  }

  getRequestObject(): any {
    return {
      'gptVersion': this.gptVersion,
    };
  }
  getWelcomeMessage(): string {
    return "<b>Welcome to the Chat</b>\n\n";
  }
} 

export class ChatPaperData extends BaseChatRequestData {
  subject: string;
  ids: string[];
  titles: string[];

  constructor(subject: string, ids: string[], titles: string[], gptVersion: string) {
    super(gptVersion);
    this.subject = subject;
    this.ids = ids;
    this.titles = titles;
  }

  getRequestObject(): any {
    return {
      ...super.getRequestObject(),
      'subject': this.subject,
      'ids': this.ids,
    };
  }

  getWelcomeMessage(): string {
    let message = "<b>Chatting with agent using the data from papers:</b>\n\n";
    this.titles.forEach(title => {
      message += `- ${title}\n`;
    });
    return message;
  }
}
 
export class ChatExplorerData extends BaseChatRequestData {
  subject: string;
  topics: ChatTopic[];
  recentProcentage: number;
  formated: boolean;

  constructor(subject: string, topics: ChatTopic[], recentProcentage: number, formated: boolean, gptVersion: string) {
    super(gptVersion);
    this.subject = subject;
    this.topics = topics;
    this.recentProcentage = recentProcentage;
    this.formated = formated;
  } 
  getRequestObject(): any {
    return {
      ...super.getRequestObject(),
      'subject': this.subject,
      'topics': this.topics,
      'recentProcentage': this.recentProcentage,
      'formated': this.formated,
    };
  }

  getWelcomeMessage(): string {
    let message = "<b>Requesting to get more information about the topics:</b>\n\n";
    this.topics.forEach(topic => {
      message += `<b>Subject:</b> ${topic.subject}\n<b>Keywords:</b> ${topic.keywords}\n\n`;
    });
    return message;
  }
}


interface ChatDataContextProps {
  chatType: ChatType;
  setChatType: React.Dispatch<React.SetStateAction<ChatType>>;

  data: BaseChatRequestData;
  setChatRequestData: React.Dispatch<React.SetStateAction<BaseChatRequestData>>; 
}


interface DataProviderProps {
    children: ReactNode;
  }


const ChatDataContext = createContext<ChatDataContextProps | undefined>(undefined);

export const ChatDataProvider: React.FC<DataProviderProps> =  ({ children }) => {
  const [data, setChatRequestData] = useState<BaseChatRequestData>(new BaseChatRequestData("3.5")); 
  const [chatType, setChatType] = useState<ChatType>(ChatType.Explorer);

  return (
    <ChatDataContext.Provider value={{ chatType, setChatType, data, setChatRequestData}}>
      {children}
    </ChatDataContext.Provider>
  );
};
 
export const useData = () => {
  const context = useContext(ChatDataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
