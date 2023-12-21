"use client";  
import { useRouter } from 'next/navigation'
import React, { useContext, useState ,useEffect} from "react"; 
import {  Button,Input,Space,Card,Empty ,Typography   } from 'antd'; 
  
import QuerySettings from "../QuerySettings" 
import APIQueryRequest  from '../APIQueryRequest';
import RequestQueryProgression from '../RequestQueryProgression'
import ResearchTopics from '../ResearchTopics'
import {Topic} from '../ResearchTopics'

import SocketContext from "../../contexts/SocketContext"; 
import { useData , ChatTopic, ChatType, ChatExplorerData} from '../../contexts/ChatDataContext'; 

const { Title} = Typography; 

const ExploreChatRequest: React.FC = () => {  
  const router = useRouter();
  const { data, setChatRequestData,setChatType } = useData();

  const socket = useContext(SocketContext);     
  const [queryInprocess, setQueryInprocess] = useState<boolean>(false);  
  const [queryState, setQueryState] = useState<boolean>(false);  
  const [questionState, setQuestionState] = useState<boolean>(false);  
  const [chatTopics, setChatTopics] = useState<ChatTopic[]>([]);

  const [isConfigOpen, setConfigOpen] = useState<boolean>(false);  

  const [question, setQuestion] = useState<string>('');  
  const [subject, setSubject] = useState<string>('');   
  const [topics, setTopics] = useState<Topic[]>([]); 

  const handleTopicsChange = (newTopics: Topic[]) => {
    setTopics(newTopics); 
  };

  const handleGo = () => {  
    let selectedTopics : ChatTopic[]  = topics.filter(topic => topic.isEnabled).map(topic => ({
      subject: topic.title,
      keywords: topic.description,
      isUserGenerated: topic.isQuestion,
      numberOfTokens:3000
    })); 
    setChatTopics(selectedTopics);
    setConfigOpen(true);
  }  

  const handleCancel = () => { 
    setConfigOpen(false);
};

  const handleOk = (sliderValues: Record<string, number>, recentProcentage: number, gptVersion: string, formatText: boolean) => { 
    setChatTopics(chatTopics.map(topic => ({
      ...topic,
      numberOfTokens: sliderValues[topic.subject]
    })));
 
    
    setChatType(ChatType.Explorer);  //"malware detection using machine learning" 
    let datas = new ChatExplorerData(subject, chatTopics, recentProcentage, formatText,  gptVersion);
    //console.log("exporerchat- getRequestObject: " , datas.getRequestObject());
    //console.log("exporerchat- getWelcomeMessage: " , datas.getWelcomeMessage());
    setChatRequestData(datas);   
    
    router.push("ChatPage");

  }    
  
  const handleAddQuestion = () => { 
    setQuestionState(true); 
    setQueryInprocess(true);

    socket?.emit('hyde question',{ sid: socket?.id, question:question}, () => { 
      setQuestionState(false); 
      setQueryInprocess(false);
     });  
  }

  const handleSubjectChange = (subject: string) => {
    setSubject(subject); 
  };
  const handleQueryStateChange = (state: boolean) => {
    setQueryState(state);
  }; 
 
  return (   
    <div >  
      <RequestQueryProgression queryInprocess={queryInprocess}  /> 
      <QuerySettings  chatTopics={chatTopics} isModalVisible={isConfigOpen} onOk={handleOk}  onCancel={handleCancel} /> 

    <Card title="Explore the latest research findings and key insights!" bordered={false}  style={{  
      display: 'flex',
      flexDirection: 'column', 
      margin:0,
      position: 'relative',
      overflow: 'auto', justifyContent: 'center',  
      padding: '10px',  
    }}> 
     <Space direction="vertical"  style={{ marginLeft: '1vw', marginRight:"1vw", textAlign: 'left' }}>   
          <APIQueryRequest onSubjectChange={handleSubjectChange}  onQueryStateChange={handleQueryStateChange}  chatRequestPage={ChatType.Explorer} canQuery={!questionState} buttonText='Explore' apiQuery='query topics'/>  
          
          <Title level={5} style = {{ flex: 1, marginTop:"1vw"}}>Add topic by question:</Title>  
          
          <Space direction="horizontal" > 
              <Input
                size="large" 
                disabled={subject == "" ? true : false}
                placeholder="Enter question... (optional)" 
                onChange={(e) => setQuestion(e.target.value)}
                style={{ width: '40vw', marginRight: '10px', borderRadius: '0px', background: '#ffffff' }} 
              />
              <Button 
                color="dashed" 
                type="primary"
                size="large"     
                onClick={handleAddQuestion}  
                disabled={queryState || subject == "" ? true : false || question.length == 0}
                loading={questionState ? true : false} 
                style={{ marginLeft: '10px', width:'4vw'  }}> 
                {questionState ? ' ' : 'Add'}
              </Button> 
          </Space>  


          <div style={{ display: 'flex' , alignItems: 'center'}}>
            <Title level={5} style = {{ flex: 1, marginTop:"1vw"}}>Interesting topics:</Title>  
          </div>

          <div style={{   
            marginLeft:'1vh',  
            height: '40vh', 
            width:'43vw',
            overflow: 'auto', 
            border: '0px solid black',
            display: 'inline-block',
             
            position: 'relative',
          }}>  
            <ResearchTopics onTopicsChange={handleTopicsChange} existingTopics={topics}  />
            <div hidden={topics.length> 0}>
                  <Empty description="Nothing yet! Enter subject and press explore!" style={{
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center', 
                    }}/> 
              </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '45vw',margin:"20px" }}> 
            <Button onClick={handleGo}   type="primary" size="large" style={{   width: '4vw' }} 
             disabled={topics.filter(topic => topic.isEnabled).length == 0 ||subject == "" ? true : false}
            > 
                Go!
            </Button> 
        </div>
        
      </Space>
    </Card>
    </div> 
  )
}  
export default ExploreChatRequest;
