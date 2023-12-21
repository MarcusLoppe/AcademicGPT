"use client";   
import ExploreChatRequest from '../components/ChatRequests/ExploreChatRequest';
import PaperChatRequest from '../components/ChatRequests/PaperChatRequest'
import AgentChatRequest from '../components/ChatRequests/AgentChatRequest'
import { Layout } from 'antd'; 
import { Typography ,Image } from 'antd';   
import { useRouter } from 'next/navigation' 
import React, {  useState, } from "react";  
import { Button } from 'antd'; 

import { Tabs } from 'antd';
import type { TabsProps } from 'antd';

const { Title, Paragraph } = Typography; 
import { DatabaseOutlined, FileTextOutlined, GlobalOutlined } from '@ant-design/icons';

const items: TabsProps['items'] = [
  {
    key: '1',
    label: (<span><DatabaseOutlined /> Chat with database</span>),
    children: <AgentChatRequest />
  },
  {
    key: '2',
    label: (<span><GlobalOutlined /> Explore latest topics</span>),
    children: <ExploreChatRequest />
  },
  {
    key: '3',
    label: (<span><FileTextOutlined /> Chat with specific papers</span>),
    children: <PaperChatRequest />,
  }
];


const tabTexts = [
  "Chat with Agent and use vector database as knowledgebase",
  "Get latest academic information and ask ChatGPT about it!",
  "Search and chat with selective papers!"
];
const tabInstructions = [
  ["1. Enter subject & populate database with some papers, e.g 'Artificial Intelligence', 'Renewable Energy' or 'Nanotechnology in Medicine'", "2. Press Go to chat with database!" ],
  ["1. Enter subject & populate database with some papers, e.g 'Artificial Intelligence', 'Renewable Energy' or 'Nanotechnology in Medicine'", "2. Select latest topics", "3. Add additional question (optional)", "4. Press Go!"], 
  ["1. Enter subject & populate database with some papers, e.g 'Artificial Intelligence', 'Renewable Energy' or 'Nanotechnology in Medicine'", "2. Select which papers you'd like to chat about and use as data source", "3. Press Go!"],
];
export default function Page() { 
  
  const [activeTabKey, setActiveTabKey] = useState(1); 
  const router = useRouter();
  const handleOpenDatabase = () => {     
    router.push("DatabaseManager");
  }
  const onChange = (key: string) => {
    setActiveTabKey(parseInt(key));
  };
  
  return (  

    <div style={{ background: 'f5f5f5', width:'100%' }}> 
     <div style={{ display: 'flex', marginLeft: '25%', alignItems: 'center', justifyContent: 'space-between' }}> 

          <img src="/icon.png" alt="Logo" style={{ height: '15vh', width: '15vh', marginRight: '2vh' }}/>
          <div style={{ flex: 1 }}>   
              {tabTexts.map((text, index) => (
                    activeTabKey === index + 1 && <Title  style={{ marginLeft: "1vw" }} key={index} level={4}>{text}
                    </Title>
              ))} 
             {tabInstructions[activeTabKey - 1].map((instruction, index) => (
              <Paragraph key={index} style={{ marginLeft: "1vw" ,marginTop:0, marginBottom:"2px"}}>
                {instruction}
              </Paragraph>
            ))}
          </div>
          <div style={{ width: '31vw', textAlign: 'left', alignSelf: 'flex-end' }}>
            <Button onClick={handleOpenDatabase} style={{marginBottom:"15px"}}
                    color="primary" 
                    type="primary" 
                    size="large">Database Manager</Button>
          </div>
        </div> 

        <Tabs style={{  
                  display: 'flex',
                   background: 'f5f5f5', 
                  position: 'relative', 
                  left: '25%', 
                width:'55vw',  
                }} 
            size={"large"}
            onChange={onChange} 
            indicatorSize={(origin) => origin - 16}
            defaultActiveKey="1" 
            items={items} /> 
    </div>
  )
} 

