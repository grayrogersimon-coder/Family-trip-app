import { Clock } from 'lucide-react';
import { PALETTE } from '../../lib/palette';
import { sortActivitiesChronologically, dayLabel, periodFromTime } from '../../lib/tripUtils';

export default function ScheduleTab({ trip, activities }) {
  const confirmed = sortActivitiesChronologically(activities.filter((a) => a.status === 'confirmed'));

  if (confirmed.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: `${PALETTE.ink}77` }}>
        <Clock size={28} style={{ marginBottom: 10, opacity: 0.5 }} />
        <div style={{ fontSize: 14 }}>Nothing confirmed yet. Confirm an activity to see it appear on the timeline.</div>
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
              return (
                <div key={a.id} style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 700, color: 'white',
                      background: period === 'AM' ? PALETTE.coral : period === 'PM' ? PALETTE.teal : `${PALETTE.ink}55`,
                      padding: '4px 9px', borderRadius: 20, flexShrink: 0, minWidth: 32, textAlign: 'center',
                    }}
                  >
                    {period || '—'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
