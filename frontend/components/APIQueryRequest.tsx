import React, { useState,useContext } from 'react';
import SocketContext from "../contexts/SocketContext"; 
import RequestQueryProgression  from './RequestQueryProgression';
import {Space, Input, Modal, Button, Slider } from 'antd';
import { ChatType} from '../contexts/ChatDataContext'; 
 
interface APIQueryRequestProps {
    onSubjectChange: (subject: string) => void;   
    onQueryStateChange: (state: boolean) => void;
    chatRequestPage: ChatType;
    canQuery?: boolean;
    buttonText?: string;
    apiQuery?: string;
  }

  const paperOptions: Record<number, { description: string; time: number }> = {
    50: { description: 'Small', time: 10 },
    200: { description: 'Medium', time: 30 },
    500: { description: 'Large', time: 70 },
  };

  const APIQueryRequest: React.FC<APIQueryRequestProps> = ({ onSubjectChange, onQueryStateChange ,chatRequestPage, canQuery = true, buttonText = "Get Latest" , apiQuery = "query subject" }) => { 
    const [isModalVisible, setIsModalVisible] = useState(false); 
    const [subject, setSubject] = useState(''); 
    const [queryState, setQueryState] = useState<boolean>(false);    
    const socket = useContext(SocketContext);      
    const [paperAmount, setPaperAmount] = useState(200); // Default to 50 papers

    const handleSliderChange = (value: number) => {
      setPaperAmount(value);
    };
    const showModal = () => {
        setIsModalVisible(true);
    };

  const handleOk = () => {
    setIsModalVisible(false); 
    setQueryState(true);   
    onQueryStateChange(true);

    socket?.emit(apiQuery,{ sid: socket?.id, subject: subject, size: paperAmount, requestPage : chatRequestPage }, () => { 
        setQueryState(false);  
        onQueryStateChange(false);
   });  
  };
  const sliderLabel = (): JSX.Element => {
    const option = paperOptions[paperAmount];
    return (
      <div>
        <b>{option.description}</b> {paperAmount} papers, estimated time <b>{option.time}s</b>
      </div>
    );
  };
  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSubject = e.target.value;
    setSubject(newSubject);
    onSubjectChange(newSubject); 
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };
  
  return (
    <>
    <RequestQueryProgression queryInprocess={queryState}  /> 
    <Space direction="horizontal">
        <Input
          size="large"
          placeholder="Enter subject..."
          onChange={handleSubjectChange}
          value={subject}
          style={{ width: '40vw', marginRight: '10px', borderRadius: '0px', background: '#ffffff' }}
        />
        <Button
          color="primary"
          type="primary"
          size="large"
          disabled={!canQuery || subject == ""}
          loading={queryState}
          onClick={showModal} 
          style={{ marginLeft: '10px', width: '4vw' }}
        > 
         {queryState ? ' ' : buttonText}  
        </Button>
      </Space>
      <Modal
        title="How many papers should the database request and import?"
        open={isModalVisible}
        onOk={handleOk}
        width={'30vw'} 
        style={{ width: '20vw', height: '20vh'}}
        onCancel={handleCancel}
      >
        <div>
         <Slider
            marks={{
                50: '50',
                200: '200',
                500: '500',
              }}
              max={500}
              min={50}
              step={null}
              defaultValue={200}
              onChange={handleSliderChange}
              value={paperAmount}
            style={{margin: '3vh 4vw 4vh 3vw'}}
        />
        
        <div>{sliderLabel()}</div>
        </div>
      </Modal>
    </>
  );
};

export default APIQueryRequest;
