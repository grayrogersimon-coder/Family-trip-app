import { useState } from 'react';
import { Clock, Pencil, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PALETTE } from '../../lib/palette';
import { sortActivitiesChronologically, dayLabel, periodFromTime, formatTimeOfDay } from '../../lib/tripUtils';
import ProposeActivityModal from '../modals/ProposeActivityModal.jsx';

export default function ScheduleTab({ trip, activities, canAct, actingMember, refetchActivities }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [error, setError] = useState(null);
  const confirmed = sortActivitiesChronologically(activities.filter((a) => a.status === 'confirmed'));

  const handleAdd = async ({ title, activityDate, activityTime }) => {
    const { error: err } = await supabase.from('activities').insert({
      trip_id: trip.id,
      title,
      activity_date: activityDate,
      activity_time: activityTime,
      proposed_by: actingMember?.id || null,
      status: 'confirmed',
    });
    if (err) throw err;
    refetchActivities?.();
  };

  const handleEdit = async ({ title, activityDate, activityTime }) => {
    const { error: err } = await supabase
      .from('activities')
      .update({ title, activity_date: activityDate, activity_time: activityTime })
      .eq('id', editingActivity.id);
    if (err) throw err;
    refetchActivities?.();
  };

  const handleRemoveFromSchedule = async (activity) => {
    const { error: err } = await supabase.from('activities').update({ status: 'proposed' }).eq('id', activity.id);
    if (err) {
      setError(err.message);
      return;
    }
    refetchActivities?.();
  };

  const addButton = canAct && (
    <button
      onClick={() => setAddOpen(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, background: PALETTE.ink, color: 'white',
        border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}
    >
      <Plus size={14} /> Add to schedule
    </button>
  );

  const modals = (
    <>
      {addOpen && (
        <ProposeActivityModal
          trip={trip}
          onClose={() => setAddOpen(false)}
          onSubmit={handleAdd}
          eyebrow="Add to schedule"
          heading="Add something to the schedule"
          submitLabel="Add"
          submittingLabel="Adding…"
        />
      )}
      {editingActivity && (
        <ProposeActivityModal
          trip={trip}
          onClose={() => setEditingActivity(null)}
          onSubmit={handleEdit}
          eyebrow="Edit schedule item"
          heading="Edit this"
          submitLabel="Save"
          submittingLabel="Saving…"
          initialTitle={editingActivity.title}
          initialActivityDate={editingActivity.activity_date}
          initialTime={editingActivity.activity_time}
        />
      )}
    </>
  );

  if (confirmed.length === 0) {
    return (
      <div>
        {addButton && <div style={{ marginBottom: 16 }}>{addButton}</div>}
        <div style={{ textAlign: 'center', padding: '48px 20px', color: `${PALETTE.ink}77` }}>
          <Clock size={28} style={{ marginBottom: 10, opacity: 0.5 }} />
          <div style={{ fontSize: 14 }}>
            Nothing on the schedule yet. Confirm a proposed activity, or add something directly above.
          </div>
        </div>
        {modals}
      </div>
    );
  }

  const byLabel = {};
  const order = [];
  confirmed.forEach((a) => {
    const label = dayLabel(trip, a.activity_date);
    if (!byLabel[label]) {
      byLabel[label] = [];
      order.push(label);
    }
    byLabel[label].push(a);
  });

  return (
    <div>
      {addButton && <div style={{ marginBottom: 16 }}>{addButton}</div>}
      {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {order.map((label) => (
          <div key={label}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PALETTE.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE.teal }} />
              {label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 4, borderLeft: `2px solid ${PALETTE.sand}`, paddingLeft: 18 }}>
              {byLabel[label].map((a) => {
                const period = periodFromTime(a.activity_time);
                const timeLabel = formatTimeOfDay(a.activity_time);
                return (
                  <div key={a.id} style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 700, color: 'white',
                        background: period === 'AM' ? PALETTE.coral : period === 'PM' ? PALETTE.teal : `${PALETTE.ink}55`,
                        padding: '4px 9px', borderRadius: 20, flexShrink: 0, minWidth: 32, textAlign: 'center', whiteSpace: 'nowrap',
                      }}
                    >
                      {timeLabel || '—'}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0 }}>{a.title}</span>
                    {canAct && (
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button
                          onClick={() => setEditingActivity(a)}
                          title="Edit"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: `${PALETTE.ink}66`, display: 'flex' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveFromSchedule(a)}
                          title="Remove from schedule (moves back to Activities as unconfirmed)"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: `${PALETTE.ink}66`, display: 'flex' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {modals}
    </div>
  );
}
