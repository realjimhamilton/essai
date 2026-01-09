const { Tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getEnvironmentVariable } = require('@langchain/core/utils/env');
const fetch = require('node-fetch');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Firecrawl tool for scraping web content from URLs
 * Uses Firecrawl API to fetch and extract content from web pages
 */
class Firecrawl extends Tool {
  name = 'firecrawl_scrape';
  description =
    'USE THIS TOOL when the user provides a specific URL to fetch or scrape. ' +
    'Scrapes and extracts content from web pages using Firecrawl. ' +
    'Automatically extracts marketing-critical information including offer details, target audience, unique mechanism, proof elements, key copy, and objection handling. ' +
    'Returns structured analysis ready for email/storyselling use. ' +
    'IMPORTANT: Use this tool (NOT web_search) when the user explicitly provides a URL or asks to "fetch", "scrape", or "get content from" a specific webpage. ' +
    'Web_search is for searching the internet, firecrawl_scrape is for fetching content from a specific URL.';

  schema = z.object({
    url: z.string().url().describe('The URL of the webpage to scrape'),
    format: z.enum(['markdown', 'html', 'rawHtml']).optional().describe('Output format (default: markdown)'),
    onlyMainContent: z.boolean().optional().describe('Extract only main content, excluding navigation and ads (default: true)'),
  });

  constructor(fields = {}) {
    super();
    this.envVar = 'FIRECRAWL_API_KEY';
    this.override = fields.override ?? false;
    this.apiKey = fields[this.envVar] ?? this.getApiKey();
    this.apiUrl = fields.FIRECRAWL_API_URL || getEnvironmentVariable('FIRECRAWL_API_URL') || 'https://api.firecrawl.dev/v1';
    
    // Get Anthropic API key for extraction
    this.anthropicApiKey = fields.ANTHROPIC_API_KEY || getEnvironmentVariable('ANTHROPIC_API_KEY');
    if (this.anthropicApiKey) {
      this.anthropicClient = new Anthropic({ apiKey: this.anthropicApiKey });
    }
  }

  getApiKey() {
    const key = getEnvironmentVariable(this.envVar);
    if (!key && !this.override) {
      throw new Error(`Missing ${this.envVar} environment variable.`);
    }
    return key;
  }

  async _call(args) {
    try {
      const { url, format = 'markdown', onlyMainContent = true } = args;

      if (!url) {
        return 'Error: URL is required.';
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (e) {
        return `Error: Invalid URL format: ${url}`;
      }

      const scrapeUrl = `${this.apiUrl}/scrape`;
      
      const requestBody = {
        url: url,
        formats: [format],
        onlyMainContent: onlyMainContent,
      };

      const response = await fetch(scrapeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return `Error: Firecrawl API request failed with status ${response.status}: ${
          errorData.message || JSON.stringify(errorData)
        }`;
      }

      const data = await response.json();
      
      // Handle error responses
      if (data.error) {
        return `Error: Firecrawl scraping failed: ${data.error.message || data.error || 'Unknown error'}`;
      }

      // Firecrawl API returns data directly or nested in 'data' property
      const scrapeResult = data.data || data;
      
      if (!scrapeResult) {
        return `Error: Firecrawl returned empty response`;
      }

      // Extract the content based on format
      let content = '';
      if (format === 'markdown' && scrapeResult.markdown) {
        content = scrapeResult.markdown;
      } else if (format === 'html' && scrapeResult.html) {
        content = scrapeResult.html;
      } else if (format === 'rawHtml' && scrapeResult.rawHtml) {
        content = scrapeResult.rawHtml;
      } else if (scrapeResult.markdown) {
        // Fallback to markdown if requested format not available
        content = scrapeResult.markdown;
      } else if (scrapeResult.content) {
        // Some Firecrawl responses have 'content' field
        content = scrapeResult.content;
      } else {
        // Last resort: return the whole result as JSON
        content = JSON.stringify(scrapeResult, null, 2);
      }

      // Include metadata if available
      const metadata = {
        url: scrapeResult.url || url,
        title: scrapeResult.metadata?.title || scrapeResult.title,
        description: scrapeResult.metadata?.description || scrapeResult.description,
        language: scrapeResult.metadata?.language || scrapeResult.language,
      };

      // Perform marketing extraction if Anthropic API key is available
      let marketingExtraction = null;
      if (this.anthropicClient && content) {
        try {
          marketingExtraction = await this.extractMarketingInfo(content, url);
        } catch (extractionError) {
          // Don't fail the whole request if extraction fails, just log it
          console.error('Marketing extraction failed:', extractionError.message);
        }
      }

      const finalResult = {
        success: true,
        url: metadata.url,
        title: metadata.title,
        description: metadata.description,
        language: metadata.language,
        content: content,
        contentLength: content.length,
      };

      if (marketingExtraction) {
        finalResult.marketingExtraction = marketingExtraction;
      }

      return JSON.stringify(finalResult, null, 2);
    } catch (err) {
      return `Error: ${err.message}`;
    }
  }

  async extractMarketingInfo(content, url) {
    if (!this.anthropicClient) {
      return null;
    }

    const extractionPrompt = `EXTRACT ALL MARKETING-CRITICAL INFORMATION FROM THIS URL:

Return a structured breakdown containing:

## OFFER DETAILS
- Product/service name
- Price point(s) and payment options
- Bonuses included
- Guarantee/refund policy
- Scarcity elements (deadlines, limited spots, etc.)

## TARGET AUDIENCE
- Who is this for (explicit and implied)
- Pain points addressed
- Desired outcomes promised

## UNIQUE MECHANISM
- What makes this solution different
- The "how it works" explanation
- Any proprietary method/system name

## PROOF ELEMENTS
- Testimonials (summarize key claims)
- Case studies
- Credentials/authority markers
- Statistics or data cited

## KEY COPY ELEMENTS
- Main headline
- Subheadlines
- Primary hooks used
- Core promise/big idea
- Call to action language

## OBJECTION HANDLING
- Objections addressed on page
- How each is countered

Return ONLY factual information found on the page. Flag anything unclear as [NOT FOUND].

URL: ${url}

PAGE CONTENT:
${content.substring(0, 200000)}`; // Limit to ~200k chars to avoid token limits

    try {
      const response = await this.anthropicClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: extractionPrompt,
          },
        ],
      });

      const extractedText = response.content[0].text;
      return extractedText;
    } catch (error) {
      throw new Error(`Marketing extraction failed: ${error.message}`);
    }
  }
}

module.exports = Firecrawl;
