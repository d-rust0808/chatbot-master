/**
 * Test Models Script
 * 
 * WHY: Test các models đã chọn xem có chạy được không
 * - Check model availability
 * - Test generate response
 * - Report results
 * 
 * NOTE: Script này không cần database, chỉ cần AI API keys
 */

import dotenv from 'dotenv';

// Load .env file trước
dotenv.config();

// Set minimal env vars cho test (không cần database)
// WHY: Config validation sẽ fail nếu thiếu DATABASE_URL và JWT_SECRET
// Nhưng test script không cần database, chỉ cần AI API keys
if (!process.env.DATABASE_URL) {
  // Build từ DB_* vars nếu có, hoặc dùng dummy value
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
    const dbUrl = `postgresql://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=${process.env.DB_SSL_MODE || 'disable'}`;
    process.env.DATABASE_URL = dbUrl;
  } else {
    // Dummy value cho test (sẽ không được dùng)
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?sslmode=disable';
  }
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only-min-32-chars-long';
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
}

// Bây giờ mới import config và các modules khác
import { modelService } from '../services/ai/model.service';
import { AIProviderFactory } from '../services/ai/ai-provider.factory';
import { config } from '../infrastructure/config';
import { logger } from '../infrastructure/logger';

// Test models từ recommended list
// WHY: Chỉ test các models trong RECOMMENDED_MODELS (đã filter bỏ models không dùng được)
const TEST_MODELS = [
  // OpenAI
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-2025-04-14', // Có thể dùng alias: 'gpt-4.1' hoặc '4.1'
  'gpt-4',
  
  // Gemini
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  // Đã xóa: 
  // - gemini-2.5-pro (rate limit issues)
  // - gemini-3-pro-preview (không dùng được)
  
  // DeepSeek
  'deepseek-chat',
  'deepseek-v3',
  'deepseek-v3.1',
  'deepseek-v3.2',
  'deepseek-r1',
];

interface TestResult {
  model: string;
  available: boolean;
  provider: string;
  testResponse?: {
    success: boolean;
    content?: string;
    error?: string;
    tokens?: number;
  };
}

/**
 * Test một model
 * WHY: Test thực tế gọi API với model
 */
async function testModel(modelName: string): Promise<TestResult> {
  const result: TestResult = {
    model: modelName,
    available: false,
    provider: 'unknown',
  };

  try {
    // 1. Check availability
    const isAvailable = await modelService.isModelAvailable(modelName);
    result.available = isAvailable;

    if (!isAvailable) {
      logger.warn(`Model ${modelName} is not available`);
      return result;
    }

    // 2. Get provider
    const provider = AIProviderFactory.getProviderFromModel(modelName);
    result.provider = provider;

    // 3. Test generate response
    try {
      const aiProvider = AIProviderFactory.create(provider);
      
      const testMessage = 'Xin chào, bạn có khỏe không?';
      const response = await aiProvider.generateResponse(
        [
          {
            role: 'system',
            content: 'Bạn là một chatbot thân thiện.',
          },
          {
            role: 'user',
            content: testMessage,
          },
        ],
        {
          model: modelName,
          temperature: 0.7,
          maxTokens: 100,
        }
      );

      result.testResponse = {
        success: true,
        content: response.content.substring(0, 100), // First 100 chars
        tokens: response.tokens?.total,
      };

      logger.info(`✅ Model ${modelName} test successful`);
    } catch (error) {
      result.testResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error(`❌ Model ${modelName} test failed:`, error);
    }
  } catch (error) {
    logger.error(`Error testing model ${modelName}:`, error);
    result.testResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  return result;
}

/**
 * Test API connection
 * WHY: Verify API key và base URL trước khi test models
 */
async function testAPIConnection(): Promise<boolean> {
  console.log('🔍 Testing API connection...\n');
  
  try {
    const testProvider = AIProviderFactory.create('openai');
    
    // Test với một model đơn giản
    const testResponse = await testProvider.generateResponse(
      [
        {
          role: 'user',
          content: 'Hi',
        },
      ],
      {
        model: 'gpt-4o-mini',
        maxTokens: 10,
      }
    );
    
    if (testResponse.content) {
      console.log('✅ API connection successful!\n');
      return true;
    }
    
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ API connection failed:');
    console.error(`   ${errorMessage}\n`);
    
    // Provide helpful suggestions
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      console.error('💡 Suggestion: Check your PROXY_API_KEY or OPENAI_API_KEY');
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
      console.error('💡 Suggestion: Check your PROXY_API_BASE URL');
      console.error(`   Current: ${config.proxy.apiBase || 'Not set'}`);
    } else if (errorMessage.includes('timeout')) {
      console.error('💡 Suggestion: Network timeout - check your internet connection');
    }
    
    return false;
  }
}

/**
 * Test all models
 */
async function testAllModels() {
  console.log('\n🧪 Testing Models...\n');
  console.log('='.repeat(80));

  // Check config
  if (!config.proxy.apiKey && !config.openai.apiKey) {
    console.error('❌ ERROR: PROXY_API_KEY or OPENAI_API_KEY must be set');
    console.error('   Please set PROXY_API_KEY and PROXY_API_BASE in .env file');
    process.exit(1);
  }

  if (config.proxy.apiKey) {
    console.log('✅ Using v98store proxy');
    console.log(`   API Base: ${config.proxy.apiBase || 'Not set'}`);
    console.log(`   API Key: ${config.proxy.apiKey ? config.proxy.apiKey.substring(0, 10) + '...' : 'Not set'}`);
    
    // Validate API base URL
    if (!config.proxy.apiBase) {
      console.error('❌ ERROR: PROXY_API_BASE must be set when using proxy');
      process.exit(1);
    }
    
    // Test connection (optional, just info)
    try {
      const url = new URL(config.proxy.apiBase);
      console.log(`   Protocol: ${url.protocol}`);
      console.log(`   Host: ${url.host}`);
    } catch (error) {
      console.warn(`   ⚠️  Invalid API Base URL: ${config.proxy.apiBase}`);
    }
  } else {
    console.log('✅ Using direct OpenAI API');
  }

  console.log('\n');

  // Test API connection first
  const connectionOk = await testAPIConnection();
  if (!connectionOk) {
    console.error('❌ Cannot proceed with model testing - API connection failed');
    console.error('   Please fix the API configuration and try again\n');
    process.exit(1);
  }

  const results: TestResult[] = [];

  // Test từng model
  for (const model of TEST_MODELS) {
    console.log(`Testing: ${model}...`);
    const result = await testModel(model);
    results.push(result);

    // Print result
    if (result.available && result.testResponse?.success) {
      console.log(`  ✅ Available & Working`);
      console.log(`     Provider: ${result.provider}`);
      console.log(`     Response: ${result.testResponse.content}...`);
      console.log(`     Tokens: ${result.testResponse.tokens}`);
    } else if (result.available && !result.testResponse?.success) {
      console.log(`  ⚠️  Available but test failed`);
      console.log(`     Error: ${result.testResponse?.error}`);
    } else {
      console.log(`  ❌ Not available`);
    }
    console.log('');
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY\n');

  const working = results.filter((r) => r.available && r.testResponse?.success);
  const failed = results.filter((r) => r.available && !r.testResponse?.success);
  const notAvailable = results.filter((r) => !r.available);

  console.log(`Total models tested: ${results.length}`);
  console.log(`✅ Available & Working: ${working.length}`);
  console.log(`⚠️  Available but Failed: ${failed.length}`);
  console.log(`❌ Not Available: ${notAvailable.length}`);

  console.log('\n✅ Working Models:');
  working.forEach((r) => {
    console.log(`  - ${r.model} (${r.provider})`);
  });

  if (failed.length > 0) {
    console.log('\n⚠️  Failed Models:');
    failed.forEach((r) => {
      console.log(`  - ${r.model}: ${r.testResponse?.error}`);
    });
  }

  if (notAvailable.length > 0) {
    console.log('\n❌ Not Available Models:');
    notAvailable.forEach((r) => {
      console.log(`  - ${r.model}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

// Run tests
if (require.main === module) {
  testAllModels()
    .then(() => {
      console.log('\n✅ Testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

export { testModel, testAllModels };

