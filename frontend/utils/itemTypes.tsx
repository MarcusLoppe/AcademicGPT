
import parse from 'html-react-parser';
import { CheckCircleTwoTone, MinusOutlined, CloseCircleTwoTone, StepForwardOutlined } from '@ant-design/icons'; 

export enum CardType {
    FunctionCall = 1,
    Converstation = 2,
  }
export enum TimelineItemState {
      Success = 1,
      Failure = 2,
      Skipped = 3,
      Neutral = 4
  }
    
  export type CardData = {
    icon?: React.ReactNode;
    title: string; 
    text: React.ReactNode;
    color : string;
    timelineItems: TimelineItemData[];
    pending?: string; 
    style?: React.CSSProperties; 
  };
  
   
  
  export type ChatResponse = {
      Type: CardType;  
      Title: string; 
      Content: string;
  };
  
  export type TimelineItemData = {
    key: number;
    items: React.ReactNode;
    color?: string;
    dot?: React.ReactNode; 
  };

  
  export  enum DetailsType {
    Document_Reference = 1,
    Document_ResearchMaterial = 2,
    Document_Proccessed = 3
  }
  
  export  type DetailsItem = {
    Type: DetailsType;
    Title: string;
    Description: string;
    Content: string;
  };

  export class TimelineEntry {
    State: TimelineItemState;
    Content: string;

    constructor(state: TimelineItemState, content: string) {
        this.State = state;
        this.Content = content;
    }

    toTimelineItemData(key: number): TimelineItemData {
      let dotIcon: React.ReactNode;
      let itemColor = "grey"; 
      switch (this.State) {
          case TimelineItemState.Success:
              dotIcon = <CheckCircleTwoTone twoToneColor="green" />;
              itemColor = "green";
              break;
          case TimelineItemState.Failure:
              dotIcon = <CloseCircleTwoTone twoToneColor="red" />;
              itemColor = "red";
              break;
          case TimelineItemState.Skipped:
              dotIcon = <StepForwardOutlined />;
              itemColor = "grey";
              break;
          case TimelineItemState.Neutral:
              dotIcon = <MinusOutlined style={{marginLeft: "2vh"}} />;
              itemColor = "grey";
              break;  
      } 
    return {
        key: key,
        items: <>{parse(this.Content.replace(/\n/g, "<br/>"))}</> ,
        color: itemColor,
        dot: dotIcon,
    };
    }
}
 