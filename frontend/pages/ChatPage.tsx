"use client"; 
import { Checkbox, Layout,Tooltip,Button, Input, Avatar,Typography   } from 'antd'; 
import React, { useContext ,useState, useEffect , useRef} from 'react';
import { useRouter } from 'next/router';
import parse from 'html-react-parser';  
import { DatabaseOutlined ,LoadingOutlined , UserOutlined } from '@ant-design/icons'; 

import ChatCards from "../components/ChatCards" 
import { useData, ChatType } from '../contexts/ChatDataContext';
import SocketContext from "../contexts/SocketContext"; 

import { CardData } from "../utils/itemTypes";
import DetailsSider from '@/components/DetailsSider';

const { Title,  Text } = Typography;  
const { Content,Sider } = Layout; 
 
  
const Chat: React.FC = () => {
  const router = useRouter();
  const socket = useContext(SocketContext);  
  const { data,  chatType } = useData();
  const [embeddPapers, setEmbeddPapers] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [feedbackPrompt, setFeedbackPrompt] = useState<string>("");
  const [waitingForFeedback, setWaitingforFeedback] = useState<boolean>(false);
  const chatLogRef = useRef<HTMLDivElement | null>(null); 

  const [chatLog, setCards] = useState<CardData[]>([]);
  const [message, setMessage] = useState<string>('');  
  
  useEffect(() => {    
    window.addEventListener('beforeunload', handleBeforeUnload); 
    router.events.on('routeChangeStart', handleBeforeUnload);

    let requestObject = data.getRequestObject();
    let topicMessage = data.getWelcomeMessage();
  

    //console.log("Request Object: ", requestObject);
    //console.log("topicMessage: ", topicMessage);

    socket?.emit('start chat',{ sid: socket?.id, 'requestPage': chatType, data: requestObject });    
    
    if(chatType == ChatType.Explorer) 
      setIsGenerating(true); 

    if(chatType != ChatType.AgentChatter) {
        let userCard: CardData = {
          icon: <Avatar size="large" style={{ backgroundColor: '#87d068' }} icon={<UserOutlined/>} />,
          title: "User",
          text:  <Text>{parse(topicMessage.replace(/\n/g, "<br/>"))}</Text>,
          color: "green",
          timelineItems: [],
          style: {
              width: '50vw',   
              float: "right",
              marginBottom: "2vh"
          }
      }; 
      setCards(prevCards => [...prevCards, userCard]);   
    }

   return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);  
    router.events.off('routeChangeStart', handleBeforeUnload);
  };
  }, [data]);  

  const handleBeforeUnload = () => { 
    socket.emit('left chat', {sid: socket.id,  message: 'User is left the page' });
  };

  const handleSetCards = (updateFunction: (cards: CardData[]) => CardData[]) => {
    setCards(updateFunction);
};
  
  useEffect(() => { 
    socket.on("user feedback required", (prompt: string) => {
      setIsGenerating(false);  
      setWaitingforFeedback(true);
      setFeedbackPrompt(prompt);

    }); 
    return () => { 
      socket.off("user feedback required"); 
    };
  }, []);
   
  useEffect(() => {
        if (chatLogRef.current)
          chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }, [chatLog]);

  const handleSendMessage = () => 
  {     
        let userCard: CardData = {
          icon: <Avatar size="large" style={{ backgroundColor: '#87d068' }} icon={<UserOutlined/>} />,
          title: "User to UserAgent",
          text:  <Text >{parse(message.replace(/\n/g, "<br/>"))}</Text>,
          color: "green",
          timelineItems: [],
          style: {
            width: '50vw',   
            float: "right", 
          }
        };

        setCards(prevCards => [...prevCards, userCard]); 
        socket?.emit('user feedback',{ sid: socket?.id, embeddPapers: embeddPapers, requestPage: chatType, question: message });  
        
        setIsGenerating(true); 
        setWaitingforFeedback(false);
        setMessage("");
  }  

  return (
    <Layout style={{ height: '90vh' }} > 
        <Content style={{ display: 'flex', flexDirection: 'column'  }}> 

            <div ref={chatLogRef} style={{ height: '100vh', overflowY: 'auto', margin: '30px', border: '1px solid #e5e5e5', borderTop: 'none' }}> 
                <ChatCards setCards={handleSetCards} chatLog={chatLog} /> 
            </div>

            <div>
                 <Title hidden={!waitingForFeedback} level={4} style={{textAlign: "center" }}>{feedbackPrompt}</Title>
            </div> 
                        
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px', borderTop: '1px solid #e5e5e5' }}>
                <Input
                    size="large"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message..."
                    style={{ flex: 1, marginRight: '10px', borderRadius: '0px', background: isGenerating ? '#d4d4d4' : '#ffffff' }}
                    disabled={isGenerating}
                />
                  <Tooltip title="Process additional papers"> 
                      <Checkbox defaultChecked={true} onChange={(e) => setEmbeddPapers(e.target.checked)}><DatabaseOutlined  style={{ fontSize: '1.5vw', color:  embeddPapers   ? 'green' : 'gray' }}  /></Checkbox>
                  </Tooltip>
                <Button onClick={handleSendMessage} color="primary" disabled={isGenerating}  type="primary" size="large">Send</Button>
            </div>
        </Content>
        
        <Sider width={300} style={{  backgroundColor: '#f5f5f5', boxShadow: '0px 3px 10px rgba(0,0,0,0.1)' }}> 
                <DetailsSider /> 
        </Sider>
    </Layout> 
); 
};
export default Chat;
