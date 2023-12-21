"use client";  
import { useRouter } from 'next/navigation'
  
import React, { useState, } from "react"; 
import {  Button,Space,Card    } from 'antd'; 

import APIQueryRequest  from '../APIQueryRequest';  
import { useData ,ChatType} from '../../contexts/ChatDataContext'; 

const AgentChatRequest: React.FC = () => {  
  const router = useRouter();
  const { setChatType} = useData(); 
    
  const [queryState, setQueryState] = useState<boolean>(false);      
    
  const handleGo = () => {   
    setChatType(ChatType.AgentChatter); 
    router.push("ChatPage");   
  }  
 
  const handleQueryStateChange = (state: boolean) => {
    setQueryState(state);
  };
  const handleSubjectChange = (subject: string) => { 
  };
 
  return (   
    <div>  

        <Card title="Chat with papers!" bordered={false}  style={{  
                display: 'flex',
                flexDirection: 'column', 
                position: 'relative',
                overflow: 'auto',  justifyContent: 'center', 
                width:'55vw',  
                padding: '10px',  boxSizing: 'border-box',
                }}> 

            <Space direction="vertical"  style={{ marginLeft: '1vw', marginRight:"1vw", textAlign: 'left' }}>  
                
            <APIQueryRequest onSubjectChange={handleSubjectChange}  onQueryStateChange={handleQueryStateChange}  chatRequestPage={ChatType.AgentChatter}/>
    
        
                <Button onClick={handleGo} loading={queryState}   type="primary" size="large" style={{ marginTop:"2vh", width: '4vw' }}>
                    Enter chat!
                </Button> 
            
            </Space>
        </Card>
    </div> 
  )
}  
export default AgentChatRequest;
