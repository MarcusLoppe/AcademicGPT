"use client";  
import { useRouter } from 'next/navigation' 
import React, { useContext, useState, useEffect } from "react";  
import {  Button, Checkbox,Layout,Typography  } from 'antd'; 
import JSZip from 'jszip';  
import RequestQueryProgression from '../RequestQueryProgression' 
import {PaperCacheData,PaperRequestType}  from './PaperTable';
import PaperTable from './PaperTable';

import SocketContext from "../../contexts/SocketContext";   

type Paper = {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  fullText: string;
  date: string;
};


const { Title} = Typography; 

const ExportPapers: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const router = useRouter();  
    const [queryState, setQueryState] = useState(false); 
    const [open, setOpen] = useState(false); 
    const [zipSelected, setZipSelected] = useState(false); 

    const [loading, setLoading] = useState(false); 
    const socket = useContext(SocketContext);      
    
    const [paperItems, setPaperItems] = useState<PaperCacheData[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); 
 
    const onSelectChange = (newSelectedRowKeys: React.Key[]) => { 
        setSelectedRowKeys(newSelectedRowKeys);
    };  

    useEffect(() => {   
        if(isActive)
            socket?.emit("get all papers",{ sid: socket?.id , type: PaperRequestType.All}); 
    },[isActive]);
     
    
    
    useEffect(() => { 
        socket.on("download request",  (receivedPapers: Paper[]) => {
            
            const papersDict: Record<string, string> = {};

            receivedPapers.forEach(paper => {
                    const formattedPaper = `
${paper.title} (${paper.date}) by ${paper.authors}
Abstract:
${paper.abstract}

FullText:
${paper.fullText}
`;
                    papersDict[paper.title] = formattedPaper;
            });

            downloadPapers(papersDict, zipSelected);
        }); 

        return () => { 
        socket.off("download request");
        };  
    }, [zipSelected]); 

    const downloadPapers = async (papersDict: Record<string, string>, zip: boolean) => {
        if (zip)
        {
            const zip = new JSZip();
            Object.entries(papersDict).forEach(([title, content]) => {
                const sanitizedTitle = title.replace(/[<>:"/\\|?*]+/g, '_'); 
                zip.file(`${sanitizedTitle}.txt`, content);
            });
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            triggerDownload(zipBlob, 'Exported_Papers.zip');
        } 
        else {
            const allPapersText = Object.values(papersDict).join('\n\n\n');
            const blob = new Blob([allPapersText], { type: 'text/plain' });
            triggerDownload(blob, 'Exported_Papers.txt');
        }
    };
    
    const triggerDownload = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Append the element to the DOM
        a.click(); // Simulate a click on the element
        window.URL.revokeObjectURL(url); // Clean up the URL object
        a.remove(); // Remove the element from the DOM
    };

    const handleDownload = () => { 
    const keys = selectedRowKeys.map((key) => key.toString()); 

    const ids = paperItems
        .filter(item => keys.includes(item.key.toString()))
        .map(item => item.id);
    
    setOpen(true); 
    setQueryState(true);
    socket?.emit("export papers",{ sid: socket?.id, ids : ids},  () => {  
        setQueryState(false);  
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

    <PaperTable setPaperTableItems={setPaperDataItems} paperData={paperItems}  requestType={PaperRequestType.All}   rowSelection={rowSelection} deletableRow={undefined} highlightedRow={undefined}/>
    
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between', // Adjust this for different spacing
        marginBottom: 16
    }}>
        <div>
            <Button type="primary" onClick={handleDownload} disabled={!hasSelected} loading={loading}>
                Download
            </Button>
            <Checkbox style={{margin:"10px"}} 
                checked={zipSelected}
                onChange={(e) => setZipSelected(e.target.checked)}
                >Export as separated TXT files</Checkbox>
            <span style={{ marginLeft: 8 }}>
                {hasSelected ? `Selected ${selectedRowKeys.length} items` : ''}
            </span>
        </div>
        <Title level={5}>Total cache: {paperItems.length}</Title>
    </div>
</div>

  )
}  
export default ExportPapers;
