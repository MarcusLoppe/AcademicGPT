"use client";  
import { useRouter } from 'next/navigation'
  
import PaperTable from "../Database/PaperTable"
import {PaperCacheData, PaperRequestType,ReceivedPaper}  from '../Database/PaperTable'; 
import React, { useContext, useState, useEffect } from "react"; 
import {  Button,Space,Card,Typography   } from 'antd';

import APIQueryRequest  from '../APIQueryRequest';
import SocketContext from "../../contexts/SocketContext"; 
import { useData, ChatType,ChatPaperData} from '../../contexts/ChatDataContext'; 
 
const { Title } = Typography; 

const PaperChatRequest: React.FC = () => {  
  const router = useRouter();
  const {setChatRequestData, setChatType,} = useData();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); 
  const [highlightedItems, setHighlightedItems] = useState<string[]>([]);
  
  const socket = useContext(SocketContext);      
  const [queryState, setQueryState] = useState<boolean>(false);    
   
  const [subject, setSubject] = useState<string>('');    
  const [paperItems, setPaperItems] = useState<PaperCacheData[]>([]);  

  const handleSubjectChange = (subject: string) => {
    setSubject(subject); 
  };
  const handleQueryStateChange = (state: boolean) => {
    setQueryState(state);
  }; 

 
    useEffect(() => { 
        socket.emit('get all papers', { sid: socket.id, type: PaperRequestType.All });  
    }, []); 
     
    
  const handleGo = () => {  
    const keys = selectedRowKeys.map((key) => key.toString()); 

    const [ids, titles] = paperItems
    .filter(item => keys.includes(item.key.toString()))
    .reduce<[string[], string[]]>(
      ([ids, titles], item) => {
        ids.push(item.id);
        titles.push(item.title);
        return [ids, titles];
      },
      [[], []]
    );  
    setChatType(ChatType.PaperChatter);
    setChatRequestData(new ChatPaperData(subject, ids, titles,  "3.5"));  
    router.push("ChatPage");   
  }  


  const onSelectChange = (newSelectedRowKeys: React.Key[]) => { 
    setSelectedRowKeys(newSelectedRowKeys);
};  

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange, 
};

  const hasSelected = selectedRowKeys.length > 0;
  
  const setPaperDataItems = (updateFunction: (papers: PaperCacheData[]) => PaperCacheData[]) => {
    setPaperItems(updateFunction);
  }; 
 
  useEffect(() => { 
    socket.on("paper subject query",  (receivedPapers: ReceivedPaper[]) => { 
      const formattedPapers: PaperCacheData[] = receivedPapers.map((paper, index) => ({
        key: index,
        title: paper.title.toString(),
        date: paper.date.toString(),
        id: paper.id.toString(),
        text: paper.text.toString()
      })); 
      const ids = formattedPapers 
       .map(item => item.key.toString());
       
      setPaperItems(prevCards => [...prevCards, ...formattedPapers]);  
      setHighlightedItems(prevCards => [...prevCards, ...ids]);  
    }); 

    return () => { 
       socket.off("paper subject query");
    };  
}, []); 


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
        <APIQueryRequest onSubjectChange={handleSubjectChange}  onQueryStateChange={handleQueryStateChange} chatRequestPage={ChatType.PaperChatter}/>


            <div style={{    
                height: '45vh',   
                width:'50vw', 
                border: '0px solid black',  
                display: 'inline-block',   
                position: 'relative', 
            }}>  
                <PaperTable setPaperTableItems={setPaperDataItems} paperData={paperItems} requestType={PaperRequestType.All} rowSelection={rowSelection} deletableRow={undefined} highlightedRow={highlightedItems}/>
                 
            </div>

            <div style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={5}>Total papers: {paperItems.length}</Title>
              <div>
                  <span style={{ marginRight: "1vw" }}>
                      {hasSelected ? `Selected ${selectedRowKeys.length} items` : ''}
                  </span>
                  <Button onClick={handleGo}  loading={queryState} type="primary" size="large" style={{ width: '4vw' }}>
                      Go!
                  </Button>
              </div>
          </div>

            
        </Space>
        </Card>
    </div> 
  )
}  
export default PaperChatRequest;
