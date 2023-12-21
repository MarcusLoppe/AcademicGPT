 
import '../app/globals.css'
import type { AppProps } from 'next/app'
import {  ConfigProvider} from 'antd';
import SocketProvider from "../contexts/SocketProvider"; 
import {ChatDataProvider } from "../contexts/ChatDataContext";  
import { useRouter } from 'next/navigation'
import { Typography} from 'antd';  
import { Layout } from 'antd';
const { Title } = Typography; 
const { Header } = Layout; 

function MyApp({ Component, pageProps } : AppProps) {  
    const router = useRouter();
    const onOpenHomePage = () => 
    {     
        router.push("/");
    }
    return (
        <>
        <ConfigProvider>
            <Layout style={{ minHeight: '100vh' , background: 'f5f5f5' }}>

            <Header style={{ 
                    backgroundColor: '#2C3E50', 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between', 
                    boxShadow: '0px 3px 10px rgba(0,0,0,0.1)',
                    width: '100%' 
                }}>

                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <img onClick={onOpenHomePage}
                            src="/logo.png" 
                            alt="Logo"
                            style={{ 
                                height: '64px', 
                                width: '64px', 
                                padding: 5, 
                                margin: 10,
                                cursor: 'pointer', 
                                transition: 'filter 0.3s',
                            }}  
                            onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(85%)'} 
                            onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                          
                        />
                        <Title level={1} style={{ color: 'white', margin: 0 }} 
                        onClick={onOpenHomePage}
                          onMouseOver={(e) => {
                            e.currentTarget.style.textDecoration = 'underline'; 
                            e.currentTarget.style.color = '#CCCCCC'; 
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.textDecoration = 'none'; 
                            e.currentTarget.style.color = 'white';
                        }}>
                            Autogen Researcher
                        </Title>  
                    </div> 

                    <Title level={4} style={{ color: 'white',  marginRight: "1vw" }} >Data comes from the source: https://core.ac.uk/</Title>
                   
            </Header>


                <Layout style={{  background: 'f5f5f5'  }}>  
                    <ChatDataProvider>
                        <SocketProvider>
                            <Component {...pageProps} />
                        </SocketProvider>
                    </ChatDataProvider>
                </Layout> 
            </Layout> 

        </ConfigProvider>
        </>
    );
}

export default MyApp;