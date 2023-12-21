import React, {  useEffect,useContext,useState } from 'react';  
import { Card,Timeline,Space,Button, Modal ,Typography } from 'antd'; 
import { CheckCircleOutlined } from '@ant-design/icons'; 

import SocketContext from "../contexts/SocketContext";
import {  TimelineEntry, TimelineItemData } from "../utils/itemTypes";

const { Title } = Typography; 
  
  export type TopicQueryProps = {  
    queryInprocess: boolean;  
  }; 

  const RequestQueryProgression: React.FC<TopicQueryProps> = ({ queryInprocess }) => {
    const socket = useContext(SocketContext);     
    const [pending, setPending] = useState<string>("");   
    const [open, setOpen] = useState<boolean>(false);   
    const [timelineItems, setTimelineItems] = useState<TimelineItemData[]>([]);   

    useEffect(() => { 
        if(queryInprocess){
            setOpen(true); 
            setTimelineItems([]);
        }
    }, [queryInprocess]);
  
    useEffect(() => { 
        socket.on("timeline pending", (msg) => {setPending(msg.Content) });

        socket.on("timeline", (msgData) => {
            const msg = new TimelineEntry(msgData.State, msgData.Content); 
            //console.log("timeline - timelineItems.length: ", timelineItems.length);
            //console.log("timeline - Got msg: ", msg);
            const timelineItem = msg.toTimelineItemData(timelineItems.length); 
            setPending("");
            setTimelineItems(currentTimelineItems => [...currentTimelineItems, timelineItem]);
        }); 
        return () => {
            socket.off("timeline");
            socket.off("timeline pending");
        };
    }, []);
     
    useEffect(() => {
    }, [timelineItems])
    const handleOk = () => {  
      setOpen(false); 
      setTimelineItems([]); 
  };
  const handleCancel = () => {  
        if(!queryInprocess){
          setOpen(false); 
          setTimelineItems([]); 
        }
        setTimelineItems([]); 
    };
    
 
    return (
        <Modal title="Querying API" open={open} width={"40vw"}  onCancel={handleCancel}  onOk={handleOk}
        footer={[
          <Button key="ok" type="primary" loading={queryInprocess} onClick={handleOk}>
            OK
          </Button>
        ]}>  

        <Space direction="vertical" size="middle" style={{ display: 'flex' }}>  
             <Card 
                 size="small" 
                 bordered={false}>
 
                 <div style={{marginTop: "20px", marginLeft:"15px"}}>  
                        <Timeline 
                            pending={pending != "" ? pending : undefined}
                            style={{margin: "30px"}}
                            items={timelineItems.map(item => ({
                                children: item.items,
                                color: item.color, 
                                dot: item.dot  
                            }))}
                        /> 
                
                  </div>
                  {!queryInprocess && (
                        <Space direction='vertical' style={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircleOutlined style={{ color: 'green', fontSize: '2vw' }} />
                            <Title level={4} style={{margin:0, padding:0}}> Success!</Title>
                        </Space>
                        )}
             </Card> 
        </Space>
        </Modal>
    );
  };
  
  

export default RequestQueryProgression;
