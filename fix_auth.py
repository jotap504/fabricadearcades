import os
import re
from pathlib import Path

def fix_auth_and_profile(filepath):
    try:
        content = Path(filepath).read_text(encoding='utf-8')
        
        # Replace `const { user } = await getAuthUser(supabase)` with `const { data: { user } } = ...` if profile isn't fetched, but it is.
        # Actually it's simpler to just do standard string replacements since the code is very uniform.
        
        # 1. Fix getAuthUser destructuring
        content = content.replace("const { user } = await getAuthUser(supabase)", "const { data: { user }, profile } = await getAuthUser(supabase)")
        content = content.replace("  } = await getAuthUser(supabase)", "  }, profile\n  } = await getAuthUser(supabase)")
        
        # 2. Remove manual profile fetching
        manual_profile = "const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()"
        content = content.replace(manual_profile, "")
        
        manual_profile_2 = "const { data: profile } = await supabase\n    .from('user_profiles')\n    .select('role')\n    .eq('id', user.id)\n    .single()"
        content = content.replace(manual_profile_2, "")
        
        # Account for indentation in manual profile
        manual_profile_3 = "  const { data: profile } = await supabase\n    .from('user_profiles')\n    .select('role')\n    .eq('id', user.id)\n    .single()"
        content = content.replace(manual_profile_3, "")

        Path(filepath).write_text(content, encoding='utf-8')
        print(f'Fixed {filepath}')
    except Exception as e:
        print(f'Error {filepath}: {e}')

for root, _, files in os.walk(r'C:\Users\user\Documents\fabricadearcades\src\app'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            fix_auth_and_profile(os.path.join(root, file))
