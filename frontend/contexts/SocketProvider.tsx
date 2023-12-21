import React, { ReactNode } from "react";
import socket from "../utils/socket";
import SocketContext from "./SocketContext";

interface SocketProviderProps {
    children: ReactNode;
  }
  
  const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
      return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
