
"use client";
import React, { useRef, useContext, useState, useEffect } from "react"; 
import {  List  } from 'antd';
import { DetailsType,DetailsItem } from "../utils/itemTypes";
import SocketContext from "../contexts/SocketContext";
import { Typography ,Space} from 'antd'; 
import DetailsDrawer  from "./DetailsDrawer";
const { Title, Paragraph, Text } = Typography;  
  
const DetailsSider: React.FC = () => {  
  const socket = useContext(SocketContext);   
  const [overviewItems, setOverview] = useState<React.ReactNode[]>([]);  
  const itemsRef = useRef<HTMLDivElement | null>(null); 
  const [previousItemsLength, setPreviousChatLogLength] = useState<number>(0);
 
  useEffect(() => {  
    socket.on('details event', (rawData) => { 
      const data = rawData as DetailsItem; 
      //console.log("DetailsOverview got:" , data);

      let itemType = "Summarization of document_1";
      switch (data.Type) {
          case DetailsType.Document_Reference:
            itemType= "Reference document";
            break;
          case DetailsType.Document_ResearchMaterial:
            itemType = "Research material provided";
            break; 
          case DetailsType.Document_Proccessed: 
            itemType = "Proccessed acedmic papers";
            break; 
      } 
      const newItem =  
        <div>
            <Title level={5}> {itemType} </Title> 
            <Paragraph> {data.Description} </Paragraph>  
        </div> 
  
      setOverview(prevItems => [...prevItems, newItem]);
    });
  
    return () => { 
       socket.off('details event');
    };
  
  }, []);

  useEffect(() => {
    if (itemsRef.current && overviewItems.length !== previousItemsLength) {  
      itemsRef.current.scrollTop = itemsRef.current.scrollHeight;
      setPreviousChatLogLength(overviewItems.length);  
  }
}, [overviewItems]);

  return (
    <div>
      <DetailsDrawer />
      <Space direction='vertical' ref={itemsRef} style={{  backgroundColor: '#f5f5f5' , height:'90vh',  overflow: 'auto' ,  display: 'inline-block',  }}>  
          
          <List
              size="small" 
              header={<Title level={3} style={{ margin:"5px", marginLeft:"20px", textAlign: "center" }}>Overview</Title>} 
          >
              <div style={{ margin:"5px", marginLeft:"15px" }}>
                  {overviewItems.map((item, idx) => (
                      <List.Item key={idx}>{item}</List.Item>
                  ))}
              </div>
          </List>
      </Space>
    </div>
  );
}

export default DetailsSider;