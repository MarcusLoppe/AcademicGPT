
"use client"; 
import React, { useState } from 'react';
import { Space, Card,Tabs} from 'antd'; 
import type { TabsProps } from 'antd'; 
import UploadEmbeddings from "../components/Database/UploadEmbeddings"
import ViewEmbeddings from "../components/Database/ViewEmbeddings"
import ExportPapers from "../components/Database/ExportPapers" 

const DatabaseManager: React.FC = () => {  
  const [activeTabKey, setActiveTabKey] = useState('1');

  const onChange = (key : string) => {
    setActiveTabKey(key);
  }; 
  const items: TabsProps['items'] = [ 
    {
      key: '1',
      label: 'Upload embeddding',
      children:  <UploadEmbeddings isActive={activeTabKey === '1'} /> 
    },
    {
      key: '2',
      label: 'View embeddings',
      children: <ViewEmbeddings isActive={activeTabKey === '2'}/>,
    },  
    {
      key: '3',
      label: 'Export',
      children:  <ExportPapers isActive={activeTabKey === '3'}/> 
    },
  ];

  return (
    <Space direction="horizontal" style={{  height:"70vh",   alignItems: 'flex-start' }} >
      <div style={{ marginRight: '2vh' }}> 
        <img src="/db_image.png" alt="Logo" style={{ height: '32vh', width: '32vh' }}/> 
      </div>
      
      <Card title="Explore the latest research findings and key insights!" bordered={false} style={{  
        width:"80%", height:'85vh',
        margin: '40px 20px 10px 0px'  
      }}> 
        <Tabs defaultActiveKey="1" items={items} onChange={onChange}/>
      </Card> 
    </Space>



  );
}

export default DatabaseManager;