import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PALETTE } from '../../lib/palette';

// Fetches a member's personal access token on demand (never preloaded into
// any list) and copies their /access/<token> link to the clipboard.
export default function CopyLinkButton({ memberId, label = 'Copy link', style }) {
  const [state, setState] = useState('idle'); // idle | loading | copied | error

  const handleClick = async () => {
    setState('loading');
    const { data, error } = await supabase.rpc('get_member_access_token', { p_member_id: memberId });
    if (error || !data) {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
      return;
    }
    const url = `${window.location.origin}/access/${data}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API can be unavailable (e.g. insecure context) -- link was still generated
    }
    setState('copied');
    setTimeout(() => setState('idle'), 1800);
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      title="Copy a personal link for this person to open the app as themselves"
      style={{
        display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
        color: state === 'error' ? PALETTE.coral : state === 'copied' ? PALETTE.teal : PALETTE.coral,
        fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: 0, flexShrink: 0,
        ...style,
      }}
    >
      {state === 'copied' ? <Check size={12} /> : <Link2 size={12} />}
      {state === 'copied' ? 'Copied' : state === 'error' ? 'Error' : state === 'loading' ? '…' : label}
    </button>
  );
}
