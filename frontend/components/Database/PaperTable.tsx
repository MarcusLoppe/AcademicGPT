
"use client";
import React, { useRef, useContext, useState, useEffect } from "react"; 
import { Typography ,Space, Button,Card,Table ,Input,InputNumber} from 'antd'; 
import { SearchOutlined } from '@ant-design/icons';  

import type { ColumnType,ColumnsType } from 'antd/es/table';
import type { InputRef } from 'antd';  

import SocketContext from "../../contexts/SocketContext";
 
const { Title} = Typography;  

export interface ReceivedPaper {
  id: string;
  title: string;
  text: string;
  date: string;
}

export enum PaperRequestType {
  Processed = 1,
  Unprocessed = 2,
  All = 3
}
type PaperResultsData = {
  paperRequestType: PaperRequestType;
  papers: ReceivedPaper[];
};

export interface PaperCacheData {
    key: React.Key;
    title: string;
    id: string;
    date: string; 
    text: string; 
  }
  export type RowSelectionType = {
    selectedRowKeys: React.Key[];
    onChange: (newSelectedRowKeys: React.Key[]) => void;
};

export type PaperTableProps = { 
    setPaperTableItems: (updateFunction: (papers: PaperCacheData[]) => PaperCacheData[]) => void;
    paperData: PaperCacheData [];   
    requestType: PaperRequestType;    
    rowSelection: RowSelectionType | undefined;    
    deletableRow: string[] | undefined; 
    highlightedRow: string[] | undefined;   
  }; 

type DataIndex = keyof PaperCacheData;

const PaperTable: React.FC<PaperTableProps> = ({ setPaperTableItems, paperData, requestType, rowSelection,deletableRow,highlightedRow  }) => {
   
  const socket = useContext(SocketContext);     
  const [embeddingSearchInput, setEmbeddingInput] = useState<string>("");  
  const [kValue, setKValue] = useState<number>(25);  
  const [loading, setLoading] = useState(false); 
  const searchInput = useRef<InputRef>(null);

  const handleSearch = (selectedKeys: string[], confirm: () => void) => {
    confirm();
  };

  const handleReset = (clearFilters: () => void, setSelectedKeys: (keys: string[]) => void, confirm: () => void) => {
    clearFilters();
    setSelectedKeys([]);
    confirm();
  };

  const getColumnSearchProps = (dataIndex: DataIndex): ColumnType<PaperCacheData> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys as string[], confirm)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => {
              if (clearFilters) {
                handleReset(clearFilters, setSelectedKeys, confirm);
              }
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => close()}
            style={{ width: 90 }}
          >
            Close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
  });

  const columns: ColumnsType<PaperCacheData> = [
    {
      title: 'Title', 
      dataIndex: 'title', 
      width:"65%", 
      ...getColumnSearchProps('title'),
    },
    Table.EXPAND_COLUMN,
    {
      title: 'Id',
      dataIndex: 'id',
      width:"20%", 
    }, 
    {
      title: 'Date',
      dataIndex: 'date',  
      sorter: (a: PaperCacheData, b: PaperCacheData) => { 
        const dateA = a.date || '';
        const dateB = b.date || '';

        if (!dateA) return 1; 
        if (!dateB) return -1;  
       // console.log(a.date+ " : " + typeof a.date);
        return a.date.localeCompare(b.date);
      },
    }, 
  ]; 
  const handleEmbeddingSearch = () =>  {  
    setLoading(true);
    socket?.emit("query embeddings",{ sid: socket?.id, type: requestType,  "query": embeddingSearchInput, "k": kValue},  () => {
      setLoading(false);
    });
  };

  useEffect(() => { 
    socket.on("paper results",  (data: PaperResultsData) => {  
      const { paperRequestType, papers   } = data; 
      if(paperRequestType != requestType) return;
 
      console.log(papers); 
      const formattedPapers: PaperCacheData[] = papers.map((paper, index) => ({
        key: index,
        title: paper.title.toString(),
        date: paper.date.toString(),
        id: paper.id.toString(),
        text: paper.text.toString()
      })); 
      setPaperTableItems(()=> formattedPapers);  
    }); 

    return () => { 
       socket.off("paper results");
    };  
}, []); 

 
  const getRowClassName = (record: PaperCacheData) => {
    if(deletableRow != undefined && deletableRow?.includes(record.key.toString()))
      return 'fade-out-transition';
    if(highlightedRow != undefined && highlightedRow?.includes(record.key.toString())) 
        return 'highlightedRow'; 

    return  '' ;
  };
 
    return (
      <div >  
        <Space direction="horizontal" size="middle" > 
            <Space direction="vertical">
                <Title level={5}>Search & sort by embedding</Title>   
                <Input size="large"  
                        onChange={(e) => setEmbeddingInput(e.target.value)}
                        placeholder="Enter subject..." 
                        style={{ width: '40vw', marginRight: '10px', borderRadius: '0px', background: '#ffffff' }} 
                    />
              </Space>
         
                <Space direction="vertical">
                  <Title level={5}>Results</Title>  
                  
                  <Space direction="horizontal">
                      <InputNumber min={3} max={100} defaultValue={5} value={kValue} onChange={(value) => setKValue(value ?? 25)}     />
                      <Button color="primary" type="primary" size="large" loading={loading} onClick={handleEmbeddingSearch}>Search</Button>
                  </Space>
              </Space> 
          </Space> 

 
          <Table rowSelection={rowSelection} style={{ width:'60vw' }}
                columns={columns} 
                loading={loading}
                dataSource={paperData} 
                rowClassName={getRowClassName}  
                className="paper-table"
                expandable={{ expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.text}</p>,      }}
                pagination={{ defaultPageSize: 50 }} scroll={{ x: "35vw" , y: "45vh" }} 
              /> 
      </div>
);
};

   
export default PaperTable;