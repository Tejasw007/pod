import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupStorage() {
  const { data, error } = await supabase.storage.createBucket('print_documents', {
    public: true,
    fileSizeLimit: 104857600, // 100MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket "print_documents" already exists.');
    } else {
      console.error('❌ Error creating bucket:', error);
    }
  } else {
    console.log('✅ Successfully created "print_documents" bucket!');
  }
}

setupStorage();
