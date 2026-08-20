import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PALETTE } from '../../lib/palette';
import { sortActivitiesChronologically, dayLabel, periodFromTime, timeForPeriod } from '../../lib/tripUtils';
import ProposeActivityModal from '../modals/ProposeActivityModal.jsx';
import SuggestDayModal from '../modals/SuggestDayModal.jsx';
import ConfirmPromptModal from '../modals/ConfirmPromptModal.jsx';

const VOTE_OPTIONS = [
  { key: 'yes', label: '👍 Yes', color: PALETTE.teal },
  { key: 'maybe', label: '🤔 Maybe', color: '#8B6F47' },
  { key: 'no', label: '👎 No', color: PALETTE.coral },
];

export default function ActivitiesTab({
  trip,
  activities,
  votes,
  suggestions,
  families,
  actingMember,
  canAct,
  onJumpToShopping,
  refetchActivities,
  refetchVotes,
  refetchSuggestions,
}) {
  const [proposeOpen, setProposeOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(null);
  const [confirmPrompt, setConfirmPrompt] = useState(null);
  const [error, setError] = useState(null);

  const votesFor = (activityId) => votes.filter((v) => v.activity_id === activityId);
  const suggestionsFor = (activityId) => suggestions.filter((s) => s.activity_id === activityId);
  const familyName = (id) => families.find((f) => f.id === id)?.family_name || 'Someone';

  const handlePropose = async ({ title, activityDate, period }) => {
    const { error: err } = await supabase.from('activities').insert({
      trip_id: trip.id,
      title,
      activity_date: activityDate,
      activity_time: timeForPeriod(period),
      proposed_by: actingMember?.id || null,
      status: 'proposed',
    });
    if (err) throw err;
    refetchActivities?.();
  };

  const handleConfirmToggle = async (activity) => {
    const nowConfirming = activity.status !== 'confirmed';
    const { error: err } = await supabase
      .from('activities')
      .update({ status: nowConfirming ? 'confirmed' : 'proposed' })
      .eq('id', activity.id);
    if (err) {
      setError(err.message);
      return;
    }
    refetchActivities?.();
    if (nowConfirming) setConfirmPrompt({ ...activity, status: 'confirmed' });
  };

  const handleVote = async (activityId, choice) => {
    if (!actingMember) return;
    const existing = votes.find((v) => v.activity_id === activityId && v.member_id === actingMember.id);
    if (existing && existing.vote === choice) {
      const { error: err } = await supabase.from('activity_votes').delete().eq('id', existing.id);
      if (err) {
        setError(err.message);
        return;
      }
      refetchVotes?.();
      return;
    }
    const { error: err } = await supabase
      .from('activity_votes')
      .upsert({ activity_id: activityId, member_id: actingMember.id, vote: choice }, { onConflict: 'activity_id,member_id' });
    if (err) {
      setError(err.message);
      return;
    }
    refetchVotes?.();
  };

  const handleSuggest = async (activityId, suggestedDate) => {
    const { error: err } = await supabase.from('activity_suggestions').insert({
      activity_id: activityId,
      suggested_date: suggestedDate,
      suggested_by_family_id: actingMember?.family_id || null,
    });
    if (err) throw err;
    refetchSuggestions?.();
  };

  const handleAdopt = async (suggestion) => {
    const { error: updateErr } = await supabase
      .from('activities')
      .update({ activity_date: suggestion.suggested_date })
      .eq('id', suggestion.activity_id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    refetchActivities?.();
    const { error: deleteErr } = await supabase.from('activity_suggestions').delete().eq('id', suggestion.id);
    if (deleteErr) {
      setError(deleteErr.message);
      return;
    }
    refetchSuggestions?.();
  };

  const handleDismiss = async (suggestion) => {
    const { error: err } = await supabase.from('activity_suggestions').delete().eq('id', suggestion.id);
    if (err) {
      setError(err.message);
      return;
    }
    refetchSuggestions?.();
  };

  return (
    <div>
      <button
        onClick={() => setProposeOpen(true)}
        disabled={!canAct}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: PALETTE.ink, color: 'white',
          border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
          cursor: canAct ? 'pointer' : 'not-allowed', opacity: canAct ? 1 : 0.5, marginBottom: 16,
        }}
      >
        <Calendar size={14} /> Propose an activity
      </button>

      {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {activities.length === 0 ? (
        <div style={{ fontSize: 14, color: `${PALETTE.ink}77`, padding: '24px 0' }}>
          Nothing proposed yet. Be the first to suggest something to do.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortActivitiesChronologically(activities).map((a) => {
            const aVotes = votesFor(a.id);
            const counts = { yes: 0, maybe: 0, no: 0 };
            aVotes.forEach((v) => {
              if (counts[v.vote] !== undefined) counts[v.vote] += 1;
            });
            const myVote = actingMember ? aVotes.find((v) => v.member_id === actingMember.id)?.vote || null : null;
            const period = periodFromTime(a.activity_time);
            const aSuggestions = suggestionsFor(a.id);

            return (
              <div key={a.id} style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.coral, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {dayLabel(trip, a.activity_date)}
                      {period ? ` · ${period}` : ''}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>{a.title}</div>
                  </div>
                  <button
                    onClick={() => handleConfirmToggle(a)}
                    disabled={!canAct}
                    style={{
                      background: a.status === 'confirmed' ? PALETTE.teal : 'white',
                      color: a.status === 'confirmed' ? 'white' : PALETTE.teal,
                      border: `1px solid ${PALETTE.teal}`, fontSize: 11, fontWeight: 700,
                      padding: '4px 10px', borderRadius: 20, cursor: canAct ? 'pointer' : 'not-allowed',
                      opacity: canAct ? 1 : 0.6, flexShrink: 0,
                    }}
                  >
                    {a.status === 'confirmed' ? 'Confirmed' : 'Confirm'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  {VOTE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleVote(a.id, opt.key)}
                      disabled={!canAct}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                        cursor: canAct ? 'pointer' : 'not-allowed',
                        border: `1.5px solid ${myVote === opt.key ? opt.color : PALETTE.sand}`,
                        background: myVote === opt.key ? opt.color : 'white',
                        color: myVote === opt.key ? 'white' : PALETTE.ink,
                      }}
                    >
                      {opt.label} · {counts[opt.key]}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSuggestOpen(a.id)}
                  disabled={!canAct}
                  style={{ background: 'none', border: 'none', color: PALETTE.teal, fontWeight: 600, fontSize: 12, cursor: canAct ? 'pointer' : 'not-allowed', padding: '10px 0 0', display: 'block' }}
                >
                  Suggest a different day →
                </button>

                {aSuggestions.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {aSuggestions.map((s) => (
                      <div key={s.id} style={{ background: PALETTE.cream, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 13 }}>
                          <strong>{familyName(s.suggested_by_family_id)}</strong> suggested <strong>{dayLabel(trip, s.suggested_date)}</strong>
                        </div>
                        {canAct && (
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => handleDismiss(s)} style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              Dismiss
                            </button>
                            <button onClick={() => handleAdopt(s)} style={{ background: PALETTE.teal, color: 'white', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              Use this day
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {proposeOpen && <ProposeActivityModal trip={trip} onClose={() => setProposeOpen(false)} onSubmit={handlePropose} />}
      {suggestOpen && (
        <SuggestDayModal
          trip={trip}
          onClose={() => setSuggestOpen(null)}
          onSubmit={(date) => handleSuggest(suggestOpen, date)}
        />
      )}
      {confirmPrompt && (
        <ConfirmPromptModal
          activity={confirmPrompt}
          onClose={() => setConfirmPrompt(null)}
          onAddItems={(activity) => {
            onJumpToShopping(activity.title);
            setConfirmPrompt(null);
          }}
        />
      )}
    </div>
  );
}
