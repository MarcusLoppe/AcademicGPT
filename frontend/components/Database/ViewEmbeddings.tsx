"use client";   
import React, { useContext, useState, useEffect } from "react";  
import { Typography } from 'antd';   

import {PaperCacheData, PaperRequestType}  from './PaperTable';
import PaperTable from './PaperTable';
import RequestQueryProgression from '../RequestQueryProgression'  
import SocketContext from "../../contexts/SocketContext";   

const { Title } = Typography; 

const ViewEmbeddings: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [queryState, setQueryState] = useState(false);  
  const socket = useContext(SocketContext);      
  
  const [paperItems, setPaperItems] = useState<PaperCacheData[]>([]); 

  useEffect(() => {   
    if(isActive) 
        socket?.emit("get all papers",{ sid: socket?.id , type: PaperRequestType.Processed});  
  },
  [isActive]);
 
 
   const setPaperDataItems = (updateFunction: (papers: PaperCacheData[]) => PaperCacheData[]) => {
    setPaperItems(updateFunction);
  }; 

  return (  
    
    <div style={{ background: 'f5f5f5', width: '100%' }}> 
      <RequestQueryProgression queryInprocess={queryState}  />  

        <PaperTable setPaperTableItems={setPaperDataItems} paperData={paperItems} requestType={PaperRequestType.Processed} rowSelection={undefined} deletableRow={undefined} highlightedRow={undefined}/>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between', // Adjust this for different spacing
            marginBottom: 16
        }}> 
        <Title level={5}>Total items: {paperItems.length}</Title>
    </div>
</div> 
  )
}  
export default ViewEmbeddings;
