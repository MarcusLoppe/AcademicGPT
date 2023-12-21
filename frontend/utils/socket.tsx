// utils/socket.js
import { io } from "socket.io-client";

const SOCKET_SERVER_URL  = 'http://localhost:5050';  

const socket = io(SOCKET_SERVER_URL);

export default socket;
