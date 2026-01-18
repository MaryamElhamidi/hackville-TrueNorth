#!/usr/bin/env node

/**
 * Test script to verify AI provider setup
 * Run with: node test-ai.js
 */

import { config } from 'dotenv';

// Load environment variables
config();

async function testAI() {
  console.log('🔍 Testing AI provider setup...\n');

  const provider = process.env.AI_PROVIDER || 'auto';
  console.log(`📋 AI Provider setting: ${provider}`);

  // Test Gemini
  if ((provider === 'gemini' || provider === 'auto') && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    console.log('🤖 Testing Gemini AI...');
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // First, try to list available models
      console.log('Listing available Gemini models...');
      try {
        const models = await genAI.listModels();
        console.log('Available models:', models.models?.map(m => m.name) || 'None found');
      } catch (listError) {
        console.log('Could not list models:', listError.message);
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const result = await model.generateContent('Say "Hello from Gemini!" in exactly 3 words.');
      const response = await result.response;
      const text = response.text().trim();

      console.log('✅ Gemini AI is working!');
      console.log(`📝 Response: "${text}"\n`);
    } catch (error) {
      console.log('❌ Gemini AI test failed:', error.message, '\n');
    }
  } else {
    console.log('⏭️  Skipping Gemini test (no API key or not enabled)\n');
  }

  // Test OpenAI
  if ((provider === 'openai' || provider === 'auto') && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    console.log('🤖 Testing OpenAI...');
    try {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const completion = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "Hello from ChatGPT!" in exactly 3 words.' }],
        max_tokens: 50,
      });

      const response = completion.choices[0].message.content.trim();
      console.log('✅ OpenAI is working!');
      console.log(`📝 Response: "${response}"\n`);
    } catch (error) {
      console.log('❌ OpenAI test failed:', error.message, '\n');
    }
  } else {
    console.log('⏭️  Skipping OpenAI test (no API key or not enabled)\n');
  }

  console.log('🎉 AI setup test completed!');
  console.log('\n💡 To get API keys:');
  console.log('   - Gemini: https://makersuite.google.com/app/apikey');
  console.log('   - OpenAI: https://platform.openai.com/api-keys');
}

testAI().catch(console.error);
