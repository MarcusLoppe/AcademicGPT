import React, {  useEffect,useContext } from 'react';
import { Switch, Collapse } from 'antd';  
import SocketContext from "../contexts/SocketContext";

export type Topic = {
    id: number;
    title: string;
    description: string;
    isQuestion: boolean;  
    isEnabled: boolean;  
  }
  export type ResearchTopicsProps = {
    onTopicsChange: (topics: Topic[]) => void; 
    existingTopics: Topic[]; 
  }; 

  const ResearchTopics: React.FC<ResearchTopicsProps> = ({ onTopicsChange, existingTopics }) => {
    const socket = useContext(SocketContext);    
  
    useEffect(() => {
        socket.on('topic event', (message: { type: string, topics: { [title: string]: string }[] }) => { 
            const incomingTopics = message.topics.map((item, index) => ({
                id: existingTopics.length + index,
                title: Object.keys(item)[0],
                description: Object.values(item)[0],
                isEnabled: message.type === "question",
                isQuestion: message.type === "question"
            })); 

            //console.log(incomingTopics);
      
            const updatedTopics = [...existingTopics, ...incomingTopics];
            const sortedTopics = updatedTopics.sort((a, b) => { 
                if (a.isQuestion && !b.isQuestion) 
                  return -1; 
                if (b.isQuestion && !a.isQuestion)  
                  return 1; 
                return 0;
              });
            onTopicsChange(sortedTopics);  
             
        }); 
 
        return () => { 
           socket.off('topic event');
        }; 
        
    }, [onTopicsChange,existingTopics]); 
  
 

    const handleSwitchChange = (id: number, checked: boolean) => {
      const updatedTopics = existingTopics.map(topic => 
        topic.id === id ? { ...topic, isEnabled: checked } : topic
      );
      onTopicsChange(updatedTopics);
    };

    const formatDescription = (description: string) => {
        return description.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < description.split('\n').length - 1 && <br />} 
          </React.Fragment>
        ));
      };


    return (
      <div >   
          {existingTopics.map(topic => (
            <div  key={topic.id} style={{ display: 'flex',   marginBottom: '3px'  }}>
              
              <div >
                  <Switch 
                    defaultChecked={topic.isEnabled}
                    onChange={(checked) => handleSwitchChange(topic.id, checked)}
                    style={{ marginRight: '10px'   }}
                /> 
              </div>

              <div>   
                <Collapse size="small" style={{   backgroundColor:topic.isQuestion ? "#93E9BE" : "", width:'40vw', margin:'0px' ,padding: '0px'}}
                    items={[{ 
                        key:topic.id, 
                        label: <p  style={{ maxWidth: '40vw' , margin:'0px' , padding: '0px'}}> {topic.title}</p>, 
                        children: <p style={{ maxWidth: '40vw' , margin:'0px', padding: '0px' }}>{formatDescription(topic.description)}</p> }]
                    }  
                     /> 
              </div>
            </div>
          ))} 
      </div >
    );
  };
  
  

export default ResearchTopics;
