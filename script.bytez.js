/**
 * Bytez API Client for JavaScript
 * Integrates Bytez AI models with Deborah
 * Based on Bytez Python SDK structure
 */

const BytezClient = {
    apiKey: '7b2126049f04e196d885fdcbb247a136',
    model: 'Qwen/Qwen3-0.6B',
    // Bytez API endpoint - update if you know the correct base URL
    baseUrl: window.BYTEZ_API_URL || 'https://api.bytez.com',
    enabled: true, // Set to false to disable Bytez and use fallback only
    
    /**
     * Call Bytez API to generate AI response
     * @param {Array} messages - Array of message objects with role and content
     * @returns {Promise<{output: string, error: any}>}
     */
    async generateResponse(messages) {
        if (!this.enabled) {
            return { output: null, error: new Error('Bytez API is disabled') };
        }

        try {
            // Convert messages to Bytez format (matching Python SDK structure)
            // Based on Python: model.run([{"role": "user", "content": "Hello"}])
            const payload = {
                model: this.model,
                messages: messages.map(msg => ({
                    role: msg.role || 'user',
                    content: msg.content || msg.text || ''
                }))
            };

            // Try different possible API endpoints and formats
            const endpoints = [
                { url: `${this.baseUrl}/v1/chat/completions`, format: 'openai' },
                { url: `${this.baseUrl}/api/v1/chat/completions`, format: 'openai' },
                { url: `${this.baseUrl}/chat/completions`, format: 'openai' },
                { url: `${this.baseUrl}/v1/completions`, format: 'openai' },
                { url: `${this.baseUrl}/api/completions`, format: 'openai' },
                { url: `${this.baseUrl}/v1/models/${this.model}/chat`, format: 'custom' },
                { url: `${this.baseUrl}/api/chat`, format: 'custom' }
            ];

            let lastError = null;
            
            for (const { url, format } of endpoints) {
                try {
                    // Try different header formats
                    const headers = {
                        'Content-Type': 'application/json'
                    };
                    
                    // Try both Bearer token and API key formats
                    if (format === 'openai') {
                        headers['Authorization'] = `Bearer ${this.apiKey}`;
                    } else {
                        headers['X-API-Key'] = this.apiKey;
                        headers['Authorization'] = `Bearer ${this.apiKey}`;
                    }

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        const data = await response.json();
                        
                        // Try different response formats (OpenAI-style, custom, etc.)
                        const output = data.choices?.[0]?.message?.content || 
                                      data.choices?.[0]?.text ||
                                      data.output || 
                                      data.text ||
                                      data.message?.content ||
                                      data.response ||
                                      data.result ||
                                      data.data?.output ||
                                      data.data?.text;
                        
                        if (output && output.trim().length > 0) {
                            console.log('✅ Bytez API response received from:', url);
                            return { output: output.trim(), error: null };
                        }
                    } else {
                        const errorText = await response.text();
                        lastError = new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
                    }
                } catch (err) {
                    lastError = err;
                    continue; // Try next endpoint
                }
            }

            // If all endpoints failed, throw the last error
            throw lastError || new Error('All API endpoints failed');
        } catch (error) {
            console.error('Bytez API error:', error);
            console.log('💡 Falling back to rule-based responses');
            return { output: null, error };
        }
    },

    /**
     * Generate response with context for Deborah
     * @param {string} userMessage - User's message
     * @param {Array} conversationHistory - Previous messages
     * @param {string} systemPrompt - System/context prompt for Deborah
     * @returns {Promise<string>}
     */
    async generateDeborahResponse(userMessage, conversationHistory = [], systemPrompt = null) {
        // Build conversation context
        const messages = [];
        
        // Add system prompt if provided
        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        } else {
            // Default Deborah system prompt
            messages.push({
                role: 'system',
                content: `You are Deborah, a compassionate and empathetic AI mental health therapist. You provide supportive, understanding, and therapeutic responses. You help users with their emotional wellbeing, mental health, and personal growth. You are warm, professional, and use a gentle, caring tone. Keep responses conversational and helpful, typically 2-4 sentences unless the user needs more detailed support.`
            });
        }

        // Add conversation history (last 10 messages for context)
        const recentHistory = conversationHistory.slice(-10);
        recentHistory.forEach(msg => {
            if (msg.sender === 'user') {
                messages.push({
                    role: 'user',
                    content: msg.text
                });
            } else if (msg.sender === 'deborah') {
                messages.push({
                    role: 'assistant',
                    content: msg.text
                });
            }
        });

        // Add current user message
        messages.push({
            role: 'user',
            content: userMessage
        });

        // Call Bytez API
        const { output, error } = await this.generateResponse(messages);

        if (error) {
            console.error('Bytez API failed, using fallback:', error);
            return null; // Return null to use fallback
        }

        return output;
    }
};

// Make available globally
window.BytezClient = BytezClient;

