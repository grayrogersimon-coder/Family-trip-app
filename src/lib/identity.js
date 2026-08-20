import { supabase } from './supabase';

// Every browser gets a real (but invisible — no login form) Supabase Auth
// user via anonymous sign-in. auth.uid() then satisfies the existing RLS
// policies without anyone ever entering an email or password. The session
// persists in localStorage via supabase-js, so returning visitors keep the
// same identity.
let ensureSessionPromise = null;

export function ensureAnonSession() {
  if (!ensureSessionPromise) {
    ensureSessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return signInData.session;
    })();
  }
  return ensureSessionPromise;
}

export async function getUserId() {
  const session = await ensureAnonSession();
  return session.user.id;
}

// A single browser can hold several "members" rows for its own family (an
// adult filled the join form once, naming their partner and kids too — all
// of those member rows share this browser's auth.uid()). "Acting as" tracks
// which of those the person is currently posting messages / voting as.
function actingMemberKey(tripId) {
  return `family-trip:${tripId}:actingMember`;
}

export function getActingMemberId(tripId) {
  return localStorage.getItem(actingMemberKey(tripId));
}

export function setActingMemberId(tripId, memberId) {
  localStorage.setItem(actingMemberKey(tripId), memberId);
}

// Given the full members list for a trip and the current browser's user id,
// return the member rows this browser "owns" (can act as).
export function myMembers(members, userId) {
  return members.filter((m) => m.user_id === userId);
}

// Adults can vote/message/manage lists; kids are display-only, matching the
// prototype's "only adults can vote, message, and manage lists" rule.
export function myActingCandidates(members, userId) {
  return myMembers(members, userId).filter((m) => m.role === 'adult');
}

export function resolveActingMember(tripId, members, userId) {
  const candidates = myActingCandidates(members, userId);
  if (candidates.length === 0) return null;
  const savedId = getActingMemberId(tripId);
  const saved = candidates.find((m) => m.id === savedId);
  if (saved) return saved;
  setActingMemberId(tripId, candidates[0].id);
  return candidates[0];
}
