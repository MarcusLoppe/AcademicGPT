import re
from models.paper import Paper 

 
 
def split_on_references(input_string): 
    pattern = re.compile(r'(BIBLIOGRAPHY|references|r\s+e\s+f\s+e\s+r\s+e\s+n\s+c\s+e\s+s)', re.IGNORECASE)
    matches = [match for match in pattern.finditer(input_string)]
     
    if matches:
        last_match = matches[-1]
        index = last_match.start()
        return input_string[:index], input_string[index:]
    else: 
        return input_string, ""
     
    
def insert_headline_seperation(text): 
    academic_paper_headlines = [
       'Title',
        'Authors and Affiliations',
        'Abstract',
        'Keywords',
        'Introduction',
        'Literature Review',
        'Methodology', 
        'Discussion', 
        'Acknowledgements',
        'References',
        'Appendices', 
        'Future Work', 
        'Conflict of Interest',
        'Ethical Considerations',  
        'Recommendations', 
        'Survey Instruments',
        'Code Availability', 
        'Hypotheses',
        'Assumptions', 
        'Dedication',
        'Preface', 
        'Chapter',
        'Section',
        'Subsection',
        'Table of Contents',
        'Foreword',
        'Prologue',
        'Epilogue',  
        'Scenarios',
        'Testimonials',
        'Appendix',
        'Endnotes',
        'Citation Index',
        'Subject Index',
        'Author Index',
        'List of Illustrations',
        'List of Tables',
        'List of Figures',
        'List of Symbols',
        'List of Abbreviations', 
        'Dedications',
        'Executive Summary',     
        'Supplementary Material'
    ]  
    for headline in academic_paper_headlines:
        pattern = re.compile(re.escape(headline), re.IGNORECASE)
        text =  pattern.sub("\n\n" + headline, text)   
    return text
