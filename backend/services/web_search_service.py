# backend/services/web_search_service.py
import aiohttp
import logging
from typing import List, Dict, Any
from urllib.parse import quote

logger = logging.getLogger(__name__)

class WebSearchService:
    def __init__(self):
        # Using DuckDuckGo Instant Answer API (no API key required)
        self.search_url = "https://api.duckduckgo.com/"
        
    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Perform web search using DuckDuckGo API"""
        try:
            encoded_query = quote(query)
            params = {
                'q': query,
                'format': 'json',
                'no_html': '1',
                'skip_disambig': '1'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.search_url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = []
                        
                        # Add abstract if available
                        if data.get('Abstract'):
                            results.append({
                                'title': data.get('Heading', 'Result'),
                                'snippet': data.get('Abstract', ''),
                                'url': data.get('AbstractURL', '')
                            })
                        
                        # Add related topics
                        for topic in data.get('RelatedTopics', [])[:max_results-1]:
                            if isinstance(topic, dict) and 'Text' in topic:
                                results.append({
                                    'title': topic.get('Text', '').split(' - ')[0] if ' - ' in topic.get('Text', '') else 'Result',
                                    'snippet': topic.get('Text', ''),
                                    'url': topic.get('FirstURL', '')
                                })
                        
                        return results[:max_results]
                    else:
                        logger.error(f"Search API returned status {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error performing web search: {str(e)}")
            return []
    
    async def search_with_serpapi(self, query: str, api_key: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Alternative: Search using SerpAPI (requires API key)"""
        try:
            params = {
                'q': query,
                'api_key': api_key,
                'num': max_results
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get('https://serpapi.com/search', params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = []
                        
                        for item in data.get('organic_results', [])[:max_results]:
                            results.append({
                                'title': item.get('title', ''),
                                'snippet': item.get('snippet', ''),
                                'url': item.get('link', '')
                            })
                        
                        return results
                    else:
                        return []
                        
        except Exception as e:
            logger.error(f"Error with SerpAPI search: {str(e)}")
            return []