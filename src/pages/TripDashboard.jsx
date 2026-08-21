import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, ShoppingBag, Package, DollarSign, MessageCircle, Trash2, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTrip } from '../hooks/useTrip';
import {
  useFamilies,
  useMembers,
  useActivities,
  useActivityVotes,
  useActivitySuggestions,
  useShoppingItems,
  useBringingItems,
  useExpenses,
  useMessages,
} from '../hooks/tripData';
import {
  ensureAnonSession,
  getUserId,
  resolveActingMember,
  myMembers as myMembersFn,
  getLastSeenMessagesAt,
  setLastSeenMessagesAt,
} from '../lib/identity';
import { PALETTE, familyColor } from '../lib/palette';
import { detectSourceType, tripDayCount } from '../lib/tripUtils';
import InviteModal from '../components/modals/InviteModal.jsx';
import FamilyDashboardModal from '../components/modals/FamilyDashboardModal.jsx';
import ConfirmDangerModal from '../components/modals/ConfirmDangerModal.jsx';
import ActivitiesTab from '../components/tabs/ActivitiesTab.jsx';
import ScheduleTab from '../components/tabs/ScheduleTab.jsx';
import ShoppingTab from '../components/tabs/ShoppingTab.jsx';
import BringingTab from '../components/tabs/BringingTab.jsx';
import ExpensesTab from '../components/tabs/ExpensesTab.jsx';
import MessagesTab from '../components/tabs/MessagesTab.jsx';

export default function TripDashboard() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState('activities');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [familyDashOpen, setFamilyDashOpen] = useState(false);
  const [dashFamilyId, setDashFamilyId] = useState(null);
  const [shoppingPrefillGroup, setShoppingPrefillGroup] = useState(null);
  const [deleteTripOpen, setDeleteTripOpen] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [deleteTripError, setDeleteTripError] = useState(null);

  useEffect(() => {
    (async () => {
      await ensureAnonSession();
      setUserId(await getUserId());
    })();
  }, []);

  const { trip, loading: tripLoading } = useTrip(tripId);
  const { data: families, loading: familiesLoading, refetch: refetchFamilies } = useFamilies(tripId);
  const familyIds = useMemo(() => families.map((f) => f.id), [families]);
  const { data: members, loading: membersLoading, refetch: refetchMembers } = useMembers(familyIds, !familiesLoading);

  const activitiesData = useActivities(tripId);
  const activityIds = useMemo(() => activitiesData.data.map((a) => a.id), [activitiesData.data]);
  const votesData = useActivityVotes(activityIds);
  const suggestionsData = useActivitySuggestions(activityIds);
  const shoppingData = useShoppingItems(tripId);
  const bringingData = useBringingItems(tripId);
  const expensesData = useExpenses(tripId);
  const messagesData = useMessages(tripId);

  const [lastSeenMessagesAt, setLastSeenMessagesAtState] = useState(() => getLastSeenMessagesAt(tripId));
  const markMessagesSeen = (iso) => {
    setLastSeenMessagesAt(tripId, iso);
    setLastSeenMessagesAtState(iso);
  };

  useEffect(() => {
    // First time this browser has ever loaded this trip's messages: don't
    // retroactively flag pre-existing chat history as unread.
    if (messagesData.loading || lastSeenMessagesAt !== null) return;
    const latest = messagesData.data[messagesData.data.length - 1];
    markMessagesSeen(latest ? latest.created_at : new Date().toISOString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesData.loading]);

  useEffect(() => {
    if (tab !== 'messages' || messagesData.data.length === 0) return;
    const latest = messagesData.data[messagesData.data.length - 1];
    if (latest.created_at !== lastSeenMessagesAt) markMessagesSeen(latest.created_at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, messagesData.data]);

  const latestMessage = messagesData.data[messagesData.data.length - 1];
  const hasUnreadMessages = Boolean(
    latestMessage && (!lastSeenMessagesAt || new Date(latestMessage.created_at) > new Date(lastSeenMessagesAt))
  );

  useEffect(() => {
    if (tripLoading || familiesLoading || membersLoading || !userId) return;
    if (!trip) {
      navigate(`/join/${tripId}`, { replace: true });
      return;
    }
    const mine = myMembersFn(members, userId);
    if (mine.length === 0) {
      navigate(`/join/${tripId}`, { replace: true });
    }
  }, [trip, tripLoading, familiesLoading, membersLoading, members, userId, tripId, navigate]);

  const familyColorMap = useMemo(() => {
    const map = {};
    families.forEach((f, i) => {
      map[f.id] = familyColor(i);
    });
    return map;
  }, [families]);

  const membersByFamily = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      if (!map[m.family_id]) map[m.family_id] = [];
      map[m.family_id].push(m);
    });
    return map;
  }, [members]);

  const actingMember = userId ? resolveActingMember(tripId, members, userId) : null;
  const canAct = Boolean(actingMember);

  const source = trip ? detectSourceType(trip.location_source_url) : null;
  const days = trip ? tripDayCount(trip) : null;

  const openFamilyDashboard = (familyId) => {
    setDashFamilyId(familyId || families[0]?.id || null);
    setFamilyDashOpen(true);
  };

  const jumpToShoppingWithGroup = (groupName) => {
    setShoppingPrefillGroup(groupName);
    setTab('shopping');
  };

  const isTripCreator = Boolean(userId && trip && trip.created_by === userId);

  const handleDeleteTrip = async () => {
    setDeletingTrip(true);
    setDeleteTripError(null);
    const { error: err } = await supabase.rpc('delete_trip', { p_trip_id: tripId });
    if (err) {
      setDeleteTripError(err.message);
      setDeletingTrip(false);
      return;
    }
    navigate('/', { replace: true });
  };

  if (tripLoading || familiesLoading || membersLoading || !trip) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
        <div style={{ fontSize: 14, color: `${PALETTE.ink}77` }}>Loading trip…</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: PALETTE.teal, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          <ArrowLeft size={14} /> All trips
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => openFamilyDashboard(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: `1px solid ${PALETTE.sand}`,
              borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: PALETTE.ink,
            }}
          >
            <User size={14} /> Family dashboard
          </button>
          {isTripCreator && (
            <button
              onClick={() => setDeleteTripOpen(true)}
              title="Delete trip"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: `1px solid ${PALETTE.sand}`,
                borderRadius: 20, padding: '7px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: PALETTE.coral,
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: PALETTE.coral, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
          {source && <source.icon size={14} />} {source?.type}
          {days > 0 && <span style={{ color: `${PALETTE.ink}66` }}>· {days} day{days !== 1 ? 's' : ''}</span>}
        </div>
        <h1 className="heading-font" style={{ fontSize: 32, fontWeight: 600 }}>{trip.name}</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {families.map((f) => {
            const fam = membersByFamily[f.id] || [];
            const adultCount = fam.filter((m) => m.role === 'adult').length;
            const kidCount = fam.filter((m) => m.role === 'kid').length;
            return (
              <div
                key={f.id}
                onClick={() => openFamilyDashboard(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: 'white', cursor: 'pointer',
                  border: `1px solid ${PALETTE.sand}`, borderRadius: 20, padding: '6px 12px', fontSize: 13, fontWeight: 600,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: familyColorMap[f.id] }} />
                {f.family_name}
                <span style={{ fontSize: 11, fontWeight: 500, color: `${PALETTE.ink}66` }}>
                  · {adultCount} adult{adultCount !== 1 ? 's' : ''}{kidCount > 0 ? `, ${kidCount} kid${kidCount !== 1 ? 's' : ''}` : ''}
                </span>
              </div>
            );
          })}
          <button
            onClick={() => setInviteOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: PALETTE.ink, color: 'white',
              border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Users size={13} /> Invite family
          </button>
        </div>
        {!canAct && (
          <div style={{ marginTop: 10, fontSize: 12, color: `${PALETTE.ink}77` }}>
            You're viewing as a kid profile on this device — ask an adult in your family to vote, message, or manage
            lists.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, background: PALETTE.sand, padding: 5, borderRadius: 12, marginBottom: 24, width: 'fit-content', flexWrap: 'wrap' }}>
        <button className={`tab-btn ${tab === 'activities' ? 'active' : ''}`} onClick={() => setTab('activities')}>
          <Calendar size={15} /> Activities
        </button>
        <button className={`tab-btn ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>
          <Clock size={15} /> Schedule
        </button>
        <button className={`tab-btn ${tab === 'shopping' ? 'active' : ''}`} onClick={() => setTab('shopping')}>
          <ShoppingBag size={15} /> Shopping
        </button>
        <button className={`tab-btn ${tab === 'bringing' ? 'active' : ''}`} onClick={() => setTab('bringing')}>
          <Package size={15} /> Bringing
        </button>
        {trip.track_expenses && (
          <button className={`tab-btn ${tab === 'expenses' ? 'active' : ''}`} onClick={() => setTab('expenses')}>
            <DollarSign size={15} /> Expenses
          </button>
        )}
        <button className={`tab-btn ${tab === 'messages' ? 'active' : ''}`} onClick={() => setTab('messages')} style={{ position: 'relative' }}>
          <MessageCircle size={15} /> Messages
          {hasUnreadMessages && tab !== 'messages' && (
            <span
              style={{
                position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: '50%',
                background: PALETTE.coral, border: '2px solid white',
              }}
            />
          )}
        </button>
      </div>

      {tab === 'activities' && (
        <ActivitiesTab
          trip={trip}
          activities={activitiesData.data}
          votes={votesData.data}
          suggestions={suggestionsData.data}
          families={families}
          familyColorMap={familyColorMap}
          actingMember={actingMember}
          canAct={canAct}
          onJumpToShopping={jumpToShoppingWithGroup}
          refetchActivities={activitiesData.refetch}
          refetchVotes={votesData.refetch}
          refetchSuggestions={suggestionsData.refetch}
        />
      )}
      {tab === 'schedule' && (
        <ScheduleTab
          trip={trip}
          activities={activitiesData.data}
          canAct={canAct}
          actingMember={actingMember}
          refetchActivities={activitiesData.refetch}
        />
      )}
      {tab === 'shopping' && (
        <ShoppingTab
          trip={trip}
          items={shoppingData.data}
          families={families}
          familyColorMap={familyColorMap}
          canAct={canAct}
          actingMember={actingMember}
          prefillGroup={shoppingPrefillGroup}
          onPrefillConsumed={() => setShoppingPrefillGroup(null)}
          refetch={shoppingData.refetch}
        />
      )}
      {tab === 'bringing' && (
        <BringingTab
          trip={trip}
          items={bringingData.data}
          families={families}
          familyColorMap={familyColorMap}
          canAct={canAct}
          actingMember={actingMember}
          refetch={bringingData.refetch}
        />
      )}
      {tab === 'expenses' && trip.track_expenses && (
        <ExpensesTab
          trip={trip}
          expenses={expensesData.data}
          families={families}
          familyColorMap={familyColorMap}
          canAct={canAct}
          actingFamilyId={actingMember?.family_id}
          refetch={expensesData.refetch}
        />
      )}
      {tab === 'messages' && (
        <MessagesTab
          trip={trip}
          messages={messagesData.data}
          members={members}
          families={families}
          refetch={messagesData.refetch}
          familyColorMap={familyColorMap}
          userId={userId}
          actingMember={actingMember}
          canAct={canAct}
        />
      )}

      {inviteOpen && <InviteModal trip={trip} onClose={() => setInviteOpen(false)} />}
      {familyDashOpen && (
        <FamilyDashboardModal
          families={families}
          members={members}
          familyColorMap={familyColorMap}
          initialFamilyId={dashFamilyId}
          shoppingItems={shoppingData.data}
          bringingItems={bringingData.data}
          expenses={trip.track_expenses ? expensesData.data : null}
          userId={userId}
          isTripCreator={isTripCreator}
          onRemoved={refetchFamilies}
          onFamiliesChanged={refetchFamilies}
          onMembersChanged={refetchMembers}
          onClose={() => setFamilyDashOpen(false)}
        />
      )}
      {deleteTripOpen && (
        <ConfirmDangerModal
          title={`Delete "${trip.name}"?`}
          message="This permanently deletes the trip and everything in it — activities, votes, shopping and bringing lists, expenses, and messages, for every family. This can't be undone."
          confirmLabel="Delete trip"
          busy={deletingTrip}
          error={deleteTripError}
          onClose={() => {
            if (!deletingTrip) {
              setDeleteTripOpen(false);
              setDeleteTripError(null);
            }
          }}
          onConfirm={handleDeleteTrip}
        />
      )}
    </div>
  );
}
