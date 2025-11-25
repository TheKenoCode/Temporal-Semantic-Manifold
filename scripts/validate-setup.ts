/**
 * Setup Validation Script
 * 
 * Validates that the AI-powered topic visualization feature is properly configured:
 * - OpenAI API key is set
 * - Database is accessible
 * - Embeddings are working
 */

import { PrismaClient } from '@prisma/client';
import { embedText } from '../src/lib/culture-embedding';

const prisma = new PrismaClient();

async function validateSetup() {
  console.log('🔍 Validating AI Topic Visualization Setup...\n');

  let hasErrors = false;

  // 1. Check OpenAI API Key
  console.log('1️⃣  Checking OpenAI API Key...');
  if (!process.env.OPENAI_API_KEY) {
    console.error('   ❌ OPENAI_API_KEY not found in environment variables');
    console.error('   → Add OPENAI_API_KEY to your .env file');
    hasErrors = true;
  } else if (process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
    console.error('   ❌ OPENAI_API_KEY is set to placeholder value');
    console.error('   → Replace with your actual OpenAI API key from https://platform.openai.com/api-keys');
    hasErrors = true;
  } else {
    console.log('   ✅ OpenAI API key found');
  }

  // 2. Check Database Connection
  console.log('\n2️⃣  Checking Database Connection...');
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✅ Database connection successful');
  } catch (error) {
    console.error('   ❌ Database connection failed');
    console.error('   → Make sure PostgreSQL is running: docker compose up -d');
    console.error('   → Error:', error instanceof Error ? error.message : error);
    hasErrors = true;
  }

  // 3. Check Schema Migrations
  console.log('\n3️⃣  Checking Database Schema...');
  try {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'Community'
        AND column_name IN ('generatedFrom', 'isGenerated')
    `;
    
    const count = Number(result[0].count);
    if (count === 2) {
      console.log('   ✅ Schema migrations applied correctly');
    } else {
      console.error('   ❌ Missing schema fields');
      console.error('   → Run: npm run prisma:migrate');
      hasErrors = true;
    }
  } catch (error) {
    console.error('   ❌ Schema check failed');
    console.error('   → Run: npm run prisma:migrate');
    console.error('   → Error:', error instanceof Error ? error.message : error);
    hasErrors = true;
  }

  // 4. Test Embeddings
  console.log('\n4️⃣  Testing Embeddings...');
  try {
    const testText = 'Ancient Rome';
    const embedding = await embedText(testText);
    
    if (embedding && embedding.length > 0) {
      console.log(`   ✅ Embeddings working (dimension: ${embedding.length})`);
      
      // Check if using OpenAI or fallback
      if (embedding.length === 1536) {
        console.log('   ℹ️  Using OpenAI text-embedding-3-small');
      } else {
        console.log('   ⚠️  Using fallback deterministic embeddings');
        console.log('   → Set OPENAI_API_KEY for real semantic embeddings');
      }
    } else {
      console.error('   ❌ Embeddings returned empty array');
      hasErrors = true;
    }
  } catch (error) {
    console.error('   ❌ Embedding test failed');
    console.error('   → Error:', error instanceof Error ? error.message : error);
    hasErrors = true;
  }

  // 5. Check API Route Files
  console.log('\n5️⃣  Checking API Routes...');
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const generateRoute = path.join(process.cwd(), 'src/app/api/generate/route.ts');
    if (fs.existsSync(generateRoute)) {
      console.log('   ✅ Generation API route exists');
    } else {
      console.error('   ❌ Generation API route missing');
      hasErrors = true;
    }
  } catch (error) {
    console.error('   ❌ File check failed');
    hasErrors = true;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Setup validation FAILED');
    console.log('\nPlease fix the issues above before using AI generation.');
    process.exit(1);
  } else {
    console.log('✅ Setup validation PASSED');
    console.log('\nYour AI Topic Visualization is ready to use!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the dev server: npm run dev');
    console.log('   2. Open http://localhost:3000');
    console.log('   3. Toggle to "AI Generated" mode');
    console.log('   4. Enter a topic and generate!');
  }

  await prisma.$disconnect();
}

validateSetup().catch((error) => {
  console.error('\n💥 Validation script error:', error);
  process.exit(1);
});

