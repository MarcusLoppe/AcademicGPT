
import React, { useContext , useEffect } from 'react';
import {  Typography } from 'antd'; 
import parse from 'html-react-parser';
import {  Space,Card,Spin ,Timeline,Avatar   } from 'antd'; 
import SocketContext from "../contexts/SocketContext";
import { CardData, TimelineEntry,CardType, ChatResponse } from "../utils/itemTypes";
import { MessageOutlined, LoadingOutlined } from '@ant-design/icons'; 
 
const {  Text } = Typography;  

  export type ChatCardProps = {
    setCards: (updateFunction: (cards: CardData[]) => CardData[]) => void;
    chatLog: CardData [];  
  }; 

  const ChatCards: React.FC<ChatCardProps> = ({ setCards, chatLog }) => {
    const socket = useContext(SocketContext);    
     
    const setPending = (message: string) => {setCards((currentChatLog) => { 
        if (currentChatLog.length === 0) return currentChatLog;
  
        const updatedLastCard = {
          ...currentChatLog[currentChatLog.length - 1],
          pending: message,
        };
        return [
          ...currentChatLog.slice(0, currentChatLog.length - 1),
          updatedLastCard,
        ];
      });
    };
  
    const setLoadedDone = () => {
      setCards((currentChatLog) => {
          if (currentChatLog.length === 0) return currentChatLog;  
          const updatedLastCard = {
          ...currentChatLog[currentChatLog.length - 1],
          icon: <Avatar size="large"  style={{ backgroundColor: '#87d068' }} icon={<MessageOutlined/>} /> ,
          color: "green"
          };
          return [
          ...currentChatLog.slice(0, currentChatLog.length - 1),
          updatedLastCard,
          ];
    });
  }; 
  
    useEffect(() => { 
      socket.on("timeline pending", (msg) => {setPending(msg.Content) });
    
      socket.on("timeline", (msgData) => {
        setCards((currentChatLog) => {

          if (currentChatLog.length === 0) return currentChatLog;
          const lastCard = { ...currentChatLog[currentChatLog.length - 1] };
          const key = lastCard.timelineItems ? lastCard.timelineItems.length : 0;
          
          const msg = new TimelineEntry(msgData.State, msgData.Content); 
          const timelineItem = msg.toTimelineItemData(key); 
     
          const newTimelineItems = [...(lastCard.timelineItems || []),  timelineItem, ]; 
          const updatedLastCard = {...lastCard,   timelineItems: newTimelineItems, };

          setPending("");
          return [
            ...currentChatLog.slice(0, currentChatLog.length - 1),
            updatedLastCard,
          ];

        });
      });
    
      return () => {
        socket.off("timeline");
        socket.off("timeline pending");
      };
  }, []);
  
     
    useEffect(() => {
      socket.on("chat response", (data : ChatResponse) => { 
        setLoadedDone(); 
        const icon = data.Type == CardType.FunctionCall ? <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} tip="Loading" /> :  <MessageOutlined />; 
        let color = data.Type == CardType.FunctionCall ? "transparent": "#87d068"; 

        //console.log("chat response ", data);
        const newCard: CardData = {
          icon: <Avatar size="large" style={{ backgroundColor: color }} icon={icon}/>,
          title: data.Title,
          text: <Text >{formatMessage(data.Content)}</Text> ,
          color: color,
          timelineItems: [],
          style: { width: '60vw'},
        }; 
        setCards((prevCards) => [...prevCards, newCard]);
      }); 
      socket.on("chat loading done", () => { setLoadedDone()   }); 
      
        socket.on("user feedback required", () => { 
          setLoadedDone(); 
        });

      return () => {
        socket.off("chat loading done");  
        socket.off("chat response");  
        socket.off("user feedback required");  
      };
    }, []);
    
  const formatMessage = (message: string) => {  
    return <>{parse(message.replace(/\n/g, "<br/>"))}</>;
  };
   
    return (
      <Space direction="vertical" size="middle" style={{ display: 'flex' }}> 
           {chatLog.map((cardItem, idx) => (
                <Card 
                    size="small" 
                    bordered={false} 
                    style={cardItem.style}
                    color ={cardItem.color}
                    key={idx}
                >
                    <Card.Meta title={cardItem.title}  avatar={cardItem.icon}/>
                    <div style={{marginTop: "20px", marginLeft:"15px"}}>
                      {cardItem.text} 
                      {
                          ((idx === chatLog.length - 1 && cardItem.pending && cardItem.pending.trim() !== "") || (cardItem.timelineItems && cardItem.timelineItems.length > 0)) && (
                              <Timeline 
                                  pending={idx === chatLog.length - 1 ? cardItem.pending : undefined}
                                  style={{margin: "30px"}}
                                  items={cardItem.timelineItems.map(item => ({
                                      children: item.items,
                                      color: item.color, 
                                      dot: item.dot  
                                  }))}
                              />
                          )
                      } 
                     </div>
                </Card>
            ))} 
      </Space>
    );
  };
  
  

export default ChatCards;
