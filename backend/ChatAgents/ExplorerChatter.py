from ChatAgents.ChatterBase import ChatterBase 
from typing import List,Any
import re 
from communication.QuerySettings import QuerySettings
from QueryRequest import ResearchQueryRequest
from autogen import oai
import time
class ExplorerChatter(ChatterBase):
    QueryContainer : List[Any]   
    
    def research(self, question :str, querySettings : QuerySettings): 
        querySettings.CollectionProcentage = 0        
        start_time = time.time()
        researchQuery = ResearchQueryRequest(question, self.ClientUpdator, querySettings)
        
        if self.embedd_papers: 
            querySettings.CollectionProcentage = 50
            researchQuery.add_from_paper_collection(self.papers)
            researchQuery.add_from_unprocced_vectordatabase()
        research_material, credits, self.numbered_credits = researchQuery.query_research() 
        
        self.ClientUpdator.ReportSuccess(f"Request took {round(time.time() - start_time, 1)} seconds")  
        return research_material
    
    def start_research(self, subject, message): 
        self.subject = subject  
        self.chat_active = False
         
        self.query_settings = QuerySettings.from_json(message) 
        self.ClientUpdator.SetPending(f"Proccesing request of information request for subject: {subject} got {len(self.papers)} fresh papers")   
         
        researchQuery = ResearchQueryRequest(subject, self.ClientUpdator, self.query_settings)
        researchQuery.add_from_paper_collection(self.papers)
        
        self.research_material, self.credits = researchQuery.query_research() 
        
        self.write_brief(self.research_material, subject)  
        
        self.ClientUpdator.SendPacket('user feedback required', "All done, any questions?" )
     
    def add_heading_tags(self, text):
        pattern_stars = r'\*\*([^*]{1,100})\*\*'
        text = re.sub(pattern_stars, r'<b>\1</b>', text) 
        text = text.replace("*", "")
        return text


    def write_brief(self,  research_material, topic):
        prompt = self.KEY_FINDINGS_PROMPT.format(
            research_material=research_material, topic=topic) 

        self.ClientUpdator.FunctionChatResponse("Writing brief..", "Asking ChatGPT to create a brief of key findings and then getting some background and Implications, Analysis, & Future Directions.")
        self.ClientUpdator.SetPending(
            "Requesting key findings from the research material...")

        response = oai.ChatCompletion.create(
            model=self.query_settings.Model,
            messages=[{"role": "system", "content": prompt}])

        brief = response['choices'][0]['message']['content']
        self.ClientUpdator.ReportSuccess("Got key findings!")

        prompt = self.REST_BRIEF_PROMPT.format(
            research_material=research_material, brief=brief) 

        self.ClientUpdator.SetPending(
            "Requesting Abstract & Background, Implications, Analysis, & Future Directions sections..")

        response = oai.ChatCompletion.create(
            model= self.query_settings.Model,
            messages=[{"role": "system", "content": prompt}])

        rest = response['choices'][0]['message']['content']
        self.ClientUpdator.ReportSuccess(
            "Got Abstract & Background, Implications, Analysis, & Future Directions sections!")

        split = "Implications, Analysis, & Future Directions"
        if split in rest:
            brief = rest.replace(split, brief + "\n" + split)
        else:
            brief += rest
        unformatedBrief = brief
        
        
        if self.query_settings.Formated == False:
            
            brief = self.add_heading_tags(brief)
        else:
            prompt = f"""Unformated text:
{brief} 
Given the unformated text above, apply <h5>, <b> and <i> tags to format it so it looks better.
"""
    
    

            self.ClientUpdator.SetPending("Last step! Requesting ChatGPT to format it so it will look pretty.")
            response = oai.ChatCompletion.create(
                model="gpt-3.5-turbo-1106",
                messages=[{"role": "system", "content": prompt}])

            brief = response['choices'][0]['message']['content']
            self.ClientUpdator.ReportSuccess("Got formated brief!")

        brief += "\n\n<h5>Information is sourced from:</h5>" + "\n".join(self.credits)

        self.ClientUpdator.ConversationChatResponse("Result: ", brief)
        print("brief")
        print(brief)
        return unformatedBrief


    KEY_FINDINGS_PROMPT = """Research Overview:
{research_material}

Task:
Summarize key findings from the research on {topic}. Each research piece is sourced. Your task is to provide a 'Key Findings' section for researchers without access to the full papers.

Guidelines for 'Key Findings':
- Present findings in a numbered list or bullet points.
- Each finding should be a concise paragraph, explicitly including quantitative data points from the research for validation.
- Emphasize specific metrics, percentages, or comparative figures where available to substantiate claims.
- Merge common themes and conclusions without separate headings for each paper.
- Highlight the collective significance in the broader field and conclude with overarching insights, addressing questions like: "What are the standout quantitative results?" and "How do these data-driven findings advance our understanding?"

Remember:
- Include all inline citations or paper titles for reference, do not use [1] or similar, the paper title must be included.
- Prioritize specific evidence and quantitative data points from the text to validate claims.
- Apply <h5>, <b> and <i> tags to format it.
"""


    REST_BRIEF_PROMPT = """Research Overview:
{research_material}

Combined Overview: Abstract & Background, Implications, Analysis, & Future Directions
Based on Key Findings:
{brief}

Task:
Create a comprehensive section encompassing 'Abstract & Background' and 'Implications, Analysis, & Future Directions' based on the key findings.

Guidelines:
1. Abstract & Background:
- Summarize central themes and shared objectives from the research findings.
- Provide an overview of common foundational knowledge or context.
- Address questions like: "What are the common themes?", "Why are these studies significant collectively?", and "What foundational knowledge do they build upon?"

2. Implications, Analysis, & Future Directions:
- Discuss the collective implications and effects of the findings.
- Analyze and contextualize the results within the broader field.
- Propose future research directions or applications, considering questions like: "How do these findings impact the field?", "Are there contrasting or complementary results?", and "What future research or applications are suggested by this analysis?"

Remember:
- Ensure clarity and coherence in summarizing the research and projecting future directions.
- Both sections should seamlessly integrate, reflecting the depth and breadth of the compiled key findings.
- Apply <h5>, <b> and <i> tags to format it.
"""
