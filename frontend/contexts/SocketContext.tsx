 
import { createContext } from "react";
import { Socket } from "socket.io-client";

const SocketContext = createContext<Socket>({} as Socket);


export default SocketContext;
