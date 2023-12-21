
"use client";
import React, {useRef, useContext, useState, useEffect } from "react"; 
import { Collapse, Button ,Drawer  } from 'antd';
import { FileTextTwoTone } from '@ant-design/icons'; 
import SocketContext from "../contexts/SocketContext";
import { DetailsType,DetailsItem } from "../utils/itemTypes";
import { Typography } from 'antd';

import { Input } from 'antd'; 
const { TextArea } = Input;
const {  Text } = Typography; 
const { Panel } = Collapse;

import { Tabs } from 'antd';

const { TabPane } = Tabs; 
type CollapseItem = {
  key: string;
  label: string;
  children: React.ReactNode;
};
const DetailsDrawer: React.FC = () => { 
  const socket = useContext(SocketContext);    
  const collapseKeyRef = useRef(0);
  const [open, setOpen] = useState(false);

  const [sourcedDocuments, setSourcedDocuments] = useState<CollapseItem[]>([]);
  const [summerization_items, setSummerization_items] = useState<CollapseItem[]>([]);  
  const [procceded_papers, setProcceded_papers] = useState<CollapseItem[]>([]); 

  useEffect(() => { 
    const setters: Record<DetailsType, React.Dispatch<React.SetStateAction<CollapseItem[]>>> = {
      [DetailsType.Document_Reference]: setSourcedDocuments,
      [DetailsType.Document_ResearchMaterial]: setSummerization_items,
      [DetailsType.Document_Proccessed]: setProcceded_papers
    };
  
    const states: Record<DetailsType, CollapseItem[]> = {
      [DetailsType.Document_Reference]: sourcedDocuments,
      [DetailsType.Document_ResearchMaterial]: summerization_items,
      [DetailsType.Document_Proccessed]: procceded_papers
    };
  
    socket.on('details event', (rawData) => { 
      const data = rawData as DetailsItem; 
      const setState = setters[data.Type];
      const currentState = states[data.Type];
  
      if (!setState || !currentState) return;  // Exit if type isn't recognized
   
      //console.log("DetailsDrawer got:" , data);
      const nextKey = collapseKeyRef.current+1;  // get the current value
      collapseKeyRef.current += 1;  // increment the value by 1
       
      const newItem = { 
        key : String(nextKey),
        label: data.Title,  // Assuming you want to use the title from the data here
        children: (
          <div>
            <Text  >
              {data.Description} 
            </Text> 
            <div style={{paddingTop:"1vh"}} >
            <TextArea autoSize={{ minRows: 3, maxRows: 44 }} defaultValue={data.Content} /></div>
          </div>
        ),
      };
 
      setState(prevItems => [...prevItems, newItem]);
    });
  
    return () => { 
      socket.off('details event');
    };
  
  }, []);
  
   
  const onClose = () => {
    setOpen(false);
  };
 
  return (
    <div>
       <Button type="primary" onClick={() => setOpen(true)} size="large" icon={<FileTextTwoTone/>} style={{ marginTop:'1vh', marginLeft:'1vw' }}>
        View research details
      </Button> 
       
      <Drawer 
        title={'Research results'}
        placement="right"
        size="large"
        onClose={onClose}  
          open={open} 
          width={"85vw"}
          >  
          <Tabs 
              defaultActiveKey="1" 
              indicatorSize={(origin) => origin - 16}
              items={[
                {
                  key: '1',
                  label: 'Sourced Documents',
                  children: (
                    <Collapse accordion defaultActiveKey={['1']}>
                      {sourcedDocuments.map(item => (
                        <Panel header={item.label} key={item.key}>
                          {item.children}
                        </Panel>
                      ))}
                    </Collapse>
                  )
                },
                {
                  key: '2',
                  label: 'Research Materials',
                  children: (
                    <Collapse accordion>
                      {summerization_items.map(item => (
                        <Panel header={item.label} key={item.key}>
                          {item.children}
                        </Panel>
                      ))}
                    </Collapse>
                  )
                },
                {
                  key: '3',
                  label: 'Database storing activity',
                  children: (
                    <Collapse accordion>
                      {procceded_papers.map(item => (
                        <Panel header={item.label} key={item.key}>
                          {item.children}
                        </Panel>
                      ))}
                    </Collapse>
                  )
                }
              ]}
            />

      </Drawer>

      
    </div>
  );
}

export default DetailsDrawer;