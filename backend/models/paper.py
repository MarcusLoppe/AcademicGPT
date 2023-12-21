from typing import Any
from datetime import datetime

class Paper:
    def __init__(self, id: str, doi: str, date: str, authors: str, title: str, abstract: str, downloadUrl: str, fullText: str):
       self.id: str = id
       self.doi: str = doi
       self.date: str = self.get_year_or_raw(date)
       self.authors: str = authors
       self.title: str = ' '.join(title.replace("\n", "").split())
       self.abstract: str = abstract
       self.downloadUrl: str = downloadUrl
       self.fullText: str = fullText
       self.distance: float = 0.0
       self.embeddings: Any = None  # Can be set to any type later
       self.preview_embeddings: Any = None  # Can be set to any type later
 
    def get_year_or_raw(self,date_str):
        try:
            return str(datetime.fromisoformat(date_str).year)
        except Exception as e: 
            return date_str 
        
    def to_string(self) -> str:
        return f"Paper(ID: {self.id}, DOI: {self.doi}, Date: {self.date}, Authors: {self.authors}, Title: {self.title}, Abstract: {self.abstract}, Download URL: {self.downloadUrl}, Full Text: {self.fullText})"

    def get_insert_query(self, table_name: str) -> tuple:
        return f"INSERT OR IGNORE INTO {table_name} (id, doi, date, authors, title, abstract, downloadUrl, fullText) VALUES (?, ?, ?, ?, ?, ?, ?,?)", (self.id, self.doi, self.date, self.authors, self.title, self.abstract, self.downloadUrl, self.fullText)
