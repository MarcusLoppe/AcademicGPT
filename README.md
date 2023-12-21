# Academic GPT Assistant 

 
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)  . 

 
Let ChatGPT access academic publications to be grounded in current most scientific accurate information!

Using the free Core APICore API ([Core API](https://core.ac.uk/services/api)) you can build up a vector database and let ChatGPT query the database that will provide it with the most relevant academic information and have the information cited. 

This project contains a **React front-end** which is and a **python backend** which handles all the queries and processing. 

The purpose of the project was to improve my React skills and understand how to implement vector databases. The React code is descent but as a mainly C# dev the python code doesn't always follow the python practices. 

<table> 
  <tr>
    <td ><center>
     <image  src="assets/QA.png"> 
    </center></td> 
  </tr> 
  <tr>
    <td ><center>
      <p>Sourced & detailed response from the Agent</p>
    </center></td> 
  </tr> 
</table>


## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage) 
- [Demonstration](#demonstration)  
- [Acknowledgements](#acknowledgements)

## Features

### Latest Academic Publications & Processing
  - Using Core API you can get up to 500 papers in a single query
  - **Bit by bit embedding** - While chatting you can choose and let it embed relevant unprocessed papers from previous Core API queries, this prevents you from needing to let it embed papers at once.
  - **Alternative Hypothetical Document Embedding (HyDE)** - By asking ChatGPT to generate 4 different detailed answers it can search the vector database much more effective 
 - **Local embedding** - Using Jina embedding ([jina-embeddings-v2-base](https://huggingface.co/jinaai/jina-embeddings-v2-base-en)) it can use the local GPU/CPU to embed the text to avoid high API costs.  
### Vector Database Management - Inspect and control vector database
  - **Upload embeddings** - View unprocessed papers and selectively embed specific papers to curate a database tailored to your research interests.
  - **View embeddings** - Inspect the current papers fully embedded in the database.
  - **Export** - Download text from papers, enabling you to upload content to an GPT agent and bypass API costs.

### Chatting Modes
  - **Chat with database** - Directly start up a chat and let the agent access the database
  - **Explore latest topics** - Generate a fully cited brief on the most recent trends and innovations in various academic fields.

  - **Chat with specific papers** - Search & choose specific papers that ChatGPT only gets its information from

### Detailed queries
- When chatting there is a button to bring up a slide where you can see exactly what information ChatGPT received and what text was taken from which paper.
- View real-time progress on what is happening, what the agent is doing, see which papers the information was sourced from, how good match they were & more!
### Extra
- Using a **hook** for the **AutoGen** agents, the front-end supports input when the Agent asks for input & full logging of the Agents actions instead of in the console.
  - At start of the project I used a team of AutoGen agents so the output of what the Agents were doing were essential, but then I realized its overkill for this task and the API calls would use a lot of tokens. 
- To query the database for more information; change the token limit in **ChatAgents/ChatterBase.py** from 2000 (Hyde generates 4 answers and for each answer it uses 2000 tokens, e.g 2000 * 4 = 6000 tokens is default when you prompt in the chat) 
## Installation

The project requires access to the Core API (**free**) and the OpenAI API (**not free**). The front-end is a node.js server & the back-end is Flask server, the communication is done via SocketIO.

### Frontend (Node.js/npm)
  
  ```bash
  cd frontend 
  npm install 
  npm run dev
  ```

### Backend (Python) 
  ```bash 
  cd backend
  pip install -r requirements.txt 
  python server.py
  ```

### OpenAI API
The project uses Autogen from Microsoft for the chatting feature & cached responses, enter **OpenAI API key** in : **OAI_CONFIG_LIST**

Here you can also modify the model the agent uses to response to your questions.
````         
"model": "gpt-3.5-turbo-1106",
"api_key": "sk-XXXX" 
````
### Core API
The API key is stored in '**backend/core_research_provider.py**' file, you'll need to change it to your own. ([Request API Key for free](https://core.ac.uk/services/api#form))
```` 
API_KEY = "XXX" 
````
## Usage 
  ```
  cd backend
  python server.py
  ``` 
    
  ```
  cd frontend 
  npm run dev
  ```

## Demonstration

![Overview](assets/overview.gif)
  

<center>
<table>
<center>
  <tr>
    <td ><center>
      <image  height="360"  src="assets/brief.png"/> 
    </center></td>
    <td ><center> 
      <image height="360" src="assets/query details.png"/> 
    </center></td> 
  </tr> 
  <tr>
    <td ><center>
    <p>Create brief about topics</p>
    </center></td>
    <td ><center>
    <p>Details & process overview</p>
    </center></td>
  </tr> 
  <tr>
    <td ><center>
      <image width="600"  src="assets/hyde_alternative.png"/>  
    </center></td>
    <td ><center> 
      <image height="360" src="assets/data references.png"/> 
    </center></td>
  </tr>
  <tr>
    <td ><center>
      <p>Alternative Hypothetical Document Embedding (HyDE)</p>
    </center></td>
    <td ><center>
    <p>See the source data</p>
    </center></td>
  </tr>  
</center>
</table>
</center>




## Acknowledgements 

- **Core API** ([Core API](https://core.ac.uk/services/api)) for providing free access to academic publications.

- **OpenAI API**

- **ChromaDB**

- **Microsoft Autogen** for enhancing the chatting feature.

- **Node.js and npm** for the frontend.

- **Flask (Python)** for efficient backend processing.

- **SocketIO** for seamless frontend-backend communication.

- **Jina embedding** ([jina-embeddings-v2-base](https://huggingface.co/jinaai/jina-embeddings-v2-base-en))