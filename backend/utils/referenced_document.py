import re
from models.paper import Paper 
from typing import List  
class Document:
    def __init__(self, text, id,  paper: Paper):
        self.text = text 
        self.paper = paper
        self.id = id
        self.fullCredit, self.fullCredit_unformated, self.startCredit, self.endCredit = self.get_paper_credit()
        
        fullText = paper.fullText.replace("\n", "") 
        
        pattern = r"\[\d+\]" 
        matches = re.findall(pattern, text)
        numeric_values = [int(match.strip("[]")) for match in matches]    
        self.matches_values = numeric_values
        
        pattern = r"\[(\d+)\](.*?)(?=\[\d+\]|$)" 
        matchesReferences = re.findall(pattern, fullText) 
        last_occurrences = {}
        for num, desc in matchesReferences:
            if int(num) in numeric_values:
                last_occurrences[int(num)] = desc.strip()

        self.references = last_occurrences
        
    def get_paper_credit(self):
        credit = self.paper.title
        paper = self.paper
        
        if paper.date is not None and paper.date != "" and paper.date != "None":
            credit += " (" + paper.date + ")" 
        elif paper.doi is not None and paper.doi != "" and paper.doi != "None":
            credit += " doi: " + paper.doi
            
        fullCredit = f"<b>{paper.title}</b>" 
        fullCredit_unformated = f"{paper.title}"
        if paper.date is not None and paper.date != "" and paper.date != "None":
            fullCredit += " (" + paper.date + ")"   
            fullCredit_unformated += " (" + paper.date + ")" 
        if paper.authors is not None and paper.authors != "" and paper.authors != "None":
            fullCredit += " by " + paper.authors 
            
        if paper.doi is not None and paper.doi != "" and paper.doi != "None":
            fullCredit += " doi: <i>" + paper.doi + "</i>" 
            fullCredit_unformated += " doi: " + paper.doi
            
        return fullCredit, fullCredit_unformated,  f"\nThe information below came from the paper: {credit}:\n", f"\nThe information above came from the paper: {credit}.\n"

     
    
    def update_references(self, ref_mapping):
        for old_ref in self.references:
            self.text = re.sub(rf"\[{old_ref}\]", f"{{TEMP{old_ref}}}", self.text)

        # Then replace each temporary marker with the new reference number
        for old_ref, new_ref in ref_mapping.items():
            self.text = self.text.replace(f"{{TEMP{old_ref}}}", f"[{new_ref}]")

        # Update the references dictionary
        updated_references = {}
        for old_ref, new_ref in ref_mapping.items():
            if old_ref in self.references:
                updated_references[new_ref] = self.references[old_ref]
        self.references = updated_references

    
class ReferenceManager:
    def __init__(self):
        self.documents : List[Document] = []
        self.reference_counter = 1
        self.reference_mapping = {}
        self.ids = []

    def add_document(self, doc: Document):
        self.documents.append(doc)   
        self.ids.append(doc.id)
        
    def get_paper_credits(self):
        return list(set([doc.fullCredit for doc in self.documents]))
        
    def contains_id(self, id):
        for item in self.documents:
            if item.id == id:
                return True
        return False
            
    def update_documents(self):
        ref_mapping = {}
        self.reference_counter = 1
        for doc in self.documents:
            local_refs = sorted(doc.references.keys(), reverse=True)
            for local_ref in local_refs:
                ref_mapping[local_ref] = self.reference_counter
                self.reference_counter += 1
                
            doc.update_references(ref_mapping)
    def preview_complied(self, doc: Document):
        self.documents.append(doc)    
        text = self.compile_documents()
        self.documents.remove(doc)   
        return text
        
    def compile_documents(self):
        self.update_documents()  # Update all documents first
        compiled_text = ""
        for doc in self.documents:  
            compiled_text += doc.startCredit + doc.text + f"\n\nReferences found in the paper {doc.fullCredit_unformated}:\n"
            for ref_num, ref_text in sorted(doc.references.items()):
                compiled_text += f"[{ref_num}] {ref_text}\n"
            
        return compiled_text.strip()
    
