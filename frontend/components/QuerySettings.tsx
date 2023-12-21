"use client";
import React, { useState,useEffect } from 'react';
import { Select,Button, Slider,Space,Modal, Checkbox } from 'antd';  
import {  ChatTopic} from '../contexts/ChatDataContext'; 
import { StarFilled, StarOutlined ,HistoryOutlined ,ThunderboltOutlined } from '@ant-design/icons'; 
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

type QuerySettingsProps = {
    chatTopics: ChatTopic[]; 
    isModalVisible: boolean;  
    onOk: (settingsData: Record<string, number>, someNumber: number, gptVersion : string, formatText : boolean) => void;  
    onCancel: () => void; 
};

const QuerySettings: React.FC<QuerySettingsProps> = ({ chatTopics, isModalVisible, onOk, onCancel }) => { 
    const [gptVersion, setGPTVersion] = useState<string>("3.5"); 
    const [formatText, setFormatText] = useState<boolean>(false); 
    const [maxSliderValue, setmaxSliderValue] = useState<number>(12000); 
    const [sliderValues, setSliderValues] = useState<Record<string, number>>({}); 
    const totalSliderValue = Object.values(sliderValues).reduce((acc, value) => acc + value, 0); 
    const [recentProcentage, setFoundationProcentage] = useState<number>(50); 

    const onFormatCheckboxChange = (e: CheckboxChangeEvent) => {
      setFormatText(e.target.checked);
    };
    const handleChange = (value: string) => { 
        setGPTVersion(value);
        setmaxSliderValue( value === '3.5' ? 12000 : 128000);
      }; 
  
    useEffect(() => {
        const initialValue = Math.min(3000, Math.floor(12000 / chatTopics.length / 1000) * 1000);
        const initialSliderValues = chatTopics.reduce((acc, topic) => ({
            ...acc,
            [topic.subject]: initialValue
        }), {});

        setSliderValues(initialSliderValues);
    }, [chatTopics.length]);
    
  
    const handleSliderChange = (subject: string, value: number) => { 
        const maxAllowedValue = maxSliderValue - totalSliderValue + (sliderValues[subject] || 1000);
      
        setSliderValues({
            ...sliderValues,
            [subject]: value > maxAllowedValue ? maxAllowedValue : value
        });
    };

    const handleOk = () => {   
        onOk(sliderValues, recentProcentage,gptVersion,formatText);
    };
 
    return (
        <Modal title='Query Settings - Information per topic' 
                onOk={handleOk}
                onCancel={onCancel} open={isModalVisible} width={'25vw'}
                footer={[
                    <Button key="cancel" onClick={onCancel}>
                        Cancel
                    </Button>,
                    <Button key="go" type="primary"  onClick={handleOk}>
                            Go!
                    </Button> 
        ]} >
            <Space direction="vertical" style={{  alignItems: 'flex-start' }} > 
                <Space direction="horizontal">
                    <h4>Model:</h4>
                    <Select
                        defaultValue="ChatGPT 3.5" style={{ width: 120 }}  onChange={handleChange}
                        options={[
                            { value: '3.5', label: 'ChatGPT 3.5' },
                            { value: '4.0', label: 'ChatGPT 4.0' },
                        ]}
                        />
                        <h4>Tokens:</h4> {totalSliderValue}/{maxSliderValue} 
                    </Space>
                {chatTopics.map(topic => (
                    <div key={topic.subject}>
                        <h4>{topic.subject} </h4>
                        <Slider
                            style= {{ width: '22vw' }}
                            min={1000} 
                            max={maxSliderValue}  // Set to the maximum value for the slider
                            step={500}
                            onChange={(value) => handleSliderChange(topic.subject, value)}
                            value={sliderValues[topic.subject] || 1000}
                            marks={{
                                1000: <StarOutlined />,
                                [maxSliderValue]: <StarFilled />
                              }}
                              trackStyle={{ backgroundImage: 'linear-gradient(to right, #ddd, #4caf50)' }}
                              handleStyle={{ borderColor: 'green' }}
                        /> 
                    </div>
                ))}

                    <h4 style={{ marginBottom: '0' }}>Balance New vs. Existing Information</h4>
                    <p style={{ marginBottom: '1rem', marginTop:0 }}>
                    Adjust the slider to set the proportion of new information compared to existing information in the vector database. 
                    0% means all existing information, 100% means all new information.
                    </p>
                    <Slider
                        style= {{ width: '22vw' }}
                        min={0} 
                        max={100} 
                        step={5}
                        onChange={(value) => setFoundationProcentage(value)}
                        value={recentProcentage}
                        marks={{
                            0: <HistoryOutlined />,
                            100: <ThunderboltOutlined />
                          }}
                         />

                    <Checkbox defaultChecked={false} onChange={onFormatCheckboxChange}>Format and make it nice using ChatGPT</Checkbox>  
            </Space>
        </Modal>
    );
};

export default QuerySettings;
