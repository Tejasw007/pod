import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function confirmEmail() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  const user = users.find((u: any) => u.email === 'tejasw@gmail.com');
  
  if (!user) {
    console.error('User tejasw@gmail.com not found');
    return;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  );

  if (updateError) {
    console.error('Error confirming email:', updateError);
  } else {
    console.log('✅ Successfully confirmed email for tejasw@gmail.com! You can now log in.');
  }
}

confirmEmail();
