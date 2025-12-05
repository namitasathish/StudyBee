const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const OLLAMA_API = 'http://localhost:11434/api';
const MODEL = 'qwen2.5:1.5b'; // Using Qwen 1.5B model

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Learning Buddy API is running' });
});

// Generate quiz questions
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { topic, difficulty = 'medium', numberOfQuestions = 5 } = req.body;
    
    const prompt = `Generate a ${difficulty} level quiz about ${topic} with ${numberOfQuestions} questions. 
    Format each question with question, 4 options (a, b, c, d), and the correct answer.
    Return the response as a JSON array of objects with the following structure:
    [
      {
        "question": "...",
        "options": ["...", "...", "...", "..."],
        "correctAnswer": 0
      }
    ]`;

        // First, ensure we have a properly formatted prompt
    const systemPrompt = `You are a helpful assistant that generates educational quiz questions. 
    Your response MUST be a valid JSON array of objects with the following structure:
    [
      {
        "question": "...",
        "options": ["...", "...", "...", "..."],
        "correctAnswer": 0
      }
    ]
    - Include exactly ${numberOfQuestions} questions
    - Each question must have exactly 4 options
    - correctAnswer must be the index of the correct option (0-3)
    - Do not include any additional text, explanations, or markdown formatting
    - Ensure the JSON is valid and properly formatted`;

    console.log('Sending request to OLLAMA with prompt:', prompt);
    
    const response = await axios.post(`${OLLAMA_API}/chat`, {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    });

    // Log the full response for debugging
    console.log('OLLAMA FULL RESPONSE ===========\n', JSON.stringify(response.data, null, 2), '\n===============================');
    
    if (!response.data || !response.data.message) {
      throw new Error('Invalid response format from OLLAMA API');
    }

    const responseContent = response.data.message.content;
    console.log('OLLAMA RESPONSE CONTENT ===========\n', responseContent, '\n===============================');
    
    let quizData;
    try {
      // Try to parse the response directly
      quizData = JSON.parse(responseContent);
      
      // Validate the quiz data structure
      if (!Array.isArray(quizData)) {
        throw new Error('Response is not an array');
      }
      
      // Validate each question
      quizData.forEach((q, i) => {
        if (!q.question || typeof q.question !== 'string') {
          throw new Error(`Question ${i + 1} is missing or invalid question text`);
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Question ${i + 1} must have exactly 4 options`);
        }
        if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
          throw new Error(`Question ${i + 1} must have a valid correctAnswer (0-3)`);
        }
      });
      
    } catch (e) {
      console.error('Error parsing quiz data:', e);
      // Fallback: try to extract JSON array from the response
      const match = responseContent.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          quizData = JSON.parse(match[0]);
        } catch (e2) {
          throw new Error('JSON in array extract still unparseable! Full response: ' + responseText);
        }
      } else {
        throw new Error("Could not extract quiz JSON from LLM response. Full response: " + responseText);
      }
    }
    res.json(quizData);
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz', 
      details: error.message,
      response: error.response?.data
    });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages must be an array' });
    }

    console.log('Chat request with messages:', JSON.stringify(messages, null, 2));
    
    const response = await axios.post(`${OLLAMA_API}/chat`, {
      model: MODEL,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 512
      }
    });

    if (!response.data || !response.data.message) {
      throw new Error('Invalid response format from OLLAMA API');
    }

    res.json({ 
      message: response.data.message.content 
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message,
      response: error.response?.data
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Make sure Ollama is running at http://localhost:11434');
});
