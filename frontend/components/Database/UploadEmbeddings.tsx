"use client";   
import React, { useContext, useState, useEffect } from "react";  
import {PaperCacheData,PaperRequestType}  from './PaperTable';
import PaperTable from './PaperTable'; 
import RequestQueryProgression from '../RequestQueryProgression' 
import {  Button } from 'antd';
import { Typography } from 'antd';   
 
import SocketContext from "../../contexts/SocketContext";   

const { Title  } = Typography;  

const UploadEmbeddings: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [queryState, setQueryState] = useState(false);  
  const socket = useContext(SocketContext);      
  
  const [paperItems, setPaperItems] = useState<PaperCacheData[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); 

  const [itemsToRemove, setItemsToRemove] = useState<string[]>([]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => { 
    setSelectedRowKeys(newSelectedRowKeys);
};  
useEffect(() => {  
  if(isActive)
      socket?.emit("get all papers",{ sid: socket?.id , type: PaperRequestType.Unprocessed}); 
},
[isActive]);

 
 const handleUpload = () => { 
  const keys = selectedRowKeys.map((key) => key.toString()); 

   const ids = paperItems
    .filter(item => keys.includes(item.key.toString()))
    .map(item => item.id);
  
   setQueryState(true);
   socket?.emit("embedd papers",{ sid: socket?.id, ids : ids},  () => {  
     setQueryState(false); 
     
    setItemsToRemove(keys);  
     setTimeout(() => { 
      setPaperItems(prevItems => prevItems.filter(item => !keys.includes(item.key.toString())));
      setItemsToRemove([]);  
    }, 3000);   
   }); 
      
 };
 
  const rowSelection = {
      selectedRowKeys,
      onChange: onSelectChange, 
  };

const hasSelected = selectedRowKeys.length > 0;
   const setPaperDataItems = (updateFunction: (papers: PaperCacheData[]) => PaperCacheData[]) => {
    setPaperItems(updateFunction);
  }; 

  return (  
    
    <div style={{ background: 'f5f5f5', width: '100%' }}> 
          <RequestQueryProgression queryInprocess={queryState}  />  

          <PaperTable setPaperTableItems={setPaperDataItems} paperData={paperItems}  requestType={PaperRequestType.Unprocessed} rowSelection={rowSelection} deletableRow={itemsToRemove} highlightedRow={undefined}/>
          <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',  
              marginBottom: 16
          }}>
              <div>
                  <Button type="primary" onClick={handleUpload} disabled={!hasSelected} loading={queryState}>
                      Upload
                  </Button>
                  <span style={{ marginLeft: 8 }}>
                      {hasSelected ? `Selected ${selectedRowKeys.length} items` : ''}
                  </span>
              </div>
              <Title level={5}>Total cache: {paperItems.length}</Title>
          </div>
      </div>

  )
}  
export default UploadEmbeddings;
