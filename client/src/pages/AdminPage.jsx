import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState.jsx';
import {
  AlertCircle,
  Calendar,
  MapPin,
  Pencil,
  Plus,
  Refresh,
  Search,
  Shield,
  Ticket,
  Trash,
  Users,
  Wallet,
} from '../components/Icons.jsx';
import { Modal } from '../components/Modal.jsx';
import { SlotEditorModal } from '../components/SlotEditorModal.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusPill } from '../components/StatusPill.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, errorMessage } from '../lib/api.js';
import {
  formatDate,
  formatMoney,
  formatTime,
  isPast,
  typeLabel,
  zoneLabel,
} from '../lib/format.js';

const TABS = ['overview', 'slots', 'reservations'];
const RESERVATION_FILTERS = ['all', 'active', 'completed', 'cancelled'];

function StatCard({ icon, label, value, foot, tone = 'mint' }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon tone-${tone}`}>{icon}</span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <small>{foot}</small>
    </div>
  );
}

function StatusFilter({ value, onChange, counts }) {
  return (
    <div className="filter-row" role="group" aria-label="Filter reservations by status">
      {RESERVATION_FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          className={value === filter ? 'filter-pill active' : 'filter-pill'}
          onClick={() => onChange(filter)}
        >
          {filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)}
          <span>{counts[filter] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

export function AdminPage() {
  const { toast } = useToast();

  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [slots, setSlots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('overview');
  const [resStatus, setResStatus] = useState('all');
  const [search, setSearch] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadAdmin = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const [statsData, slotsData, reservationsData] = await Promise.all([
        api('/admin/stats'),
        api('/admin/slots'),
        api('/admin/reservations?limit=300'),
      ]);
      setStats(statsData.stats);
      setRecent(statsData.recentReservations || []);
      setSlots(slotsData.slots);
      setReservations(reservationsData.reservations);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  const resCounts = useMemo(
    () =>
      reservations.reduce(
        (acc, reservation) => {
          acc.all += 1;
          acc[reservation.status] = (acc[reservation.status] || 0) + 1;
          return acc;
        },
        { all: 0, active: 0, completed: 0, cancelled: 0 },
      ),
    [reservations],
  );

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reservations.filter((reservation) => {
      if (resStatus !== 'all' && reservation.status !== resStatus) return false;
      if (!query) return true;
      return [
        reservation.reference,
        reservation.vehiclePlate,
        reservation.slot?.code,
        reservation.slot?.level,
        reservation.user?.name,
        reservation.user?.email,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [reservations, resStatus, search]);

  const activeSlots = slots.filter((slot) => slot.isActive).length;

  function openCreate() {
    setEditingSlot(null);
    setEditorOpen(true);
  }

  function openEdit(slot) {
    setEditingSlot(slot);
    setEditorOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const data = await api(`/slots/${deleteTarget.id}`, { method: 'DELETE' });
      toast(data.message || 'Parking bay deleted.');
      setDeleteTarget(null);
      await loadAdmin();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancelReservation() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api(`/reservations/${cancelTarget.id}/cancel`, { method: 'PATCH' });
      toast(`Reservation ${cancelTarget.reference} cancelled.`);
      setCancelTarget(null);
      await loadAdmin();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="admin-page container">
      <div className="page-head admin-page-head">
        <div>
          <span className="eyebrow">
            <Shield size={13} /> Operations
          </span>
          <h1>Admin console</h1>
          <p>Manage bays, monitor occupancy and keep every reservation on track.</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={loadAdmin}
          disabled={refreshing}
        >
          <Refresh size={16} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={loadAdmin}>
            Retry
          </button>
        </div>
      )}

      <div className="admin-stats">
        <StatCard
          icon={<Wallet size={19} />}
          label="Booking revenue"
          value={loading ? '—' : formatMoney(stats?.revenue ?? 0)}
          foot="Non-cancelled reservations"
          tone="mint"
        />
        <StatCard
          icon={<MapPin size={19} />}
          label="Live occupancy"
          value={loading ? '—' : `${stats?.occupancyRate ?? 0}%`}
          foot={`${stats?.occupiedNow ?? 0} of ${stats?.activeSlots ?? 0} bays in use`}
          tone="cyan"
        />
        <StatCard
          icon={<Calendar size={19} />}
          label="Upcoming bookings"
          value={loading ? '—' : stats?.upcomingReservations ?? 0}
          foot={`${stats?.todaysReservations ?? 0} starting today`}
          tone="amber"
        />
        <StatCard
          icon={<Users size={19} />}
          label="Registered drivers"
          value={loading ? '—' : stats?.totalUsers ?? 0}
          foot={`${activeSlots} active bays available`}
          tone="violet"
        />
      </div>

      <div className="tabs admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? 'tab active' : 'tab'}
            onClick={() => setTab(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
            {item === 'slots' && <span className="tab-count">{slots.length}</span>}
            {item === 'reservations' && <span className="tab-count">{reservations.length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-loading">
          <Spinner size={28} />
          <p>Loading the control room…</p>
        </div>
      ) : tab === 'overview' ? (
        <div className="overview-grid">
          <div className="panel panel-grow">
            <div className="panel-head">
              <div>
                <h2>Recent bookings</h2>
                <p>The latest reservations across the lot.</p>
              </div>
              <button type="button" className="link-btn" onClick={() => setTab('reservations')}>
                View all →
              </button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Driver</th>
                    <th>Bay</th>
                    <th>Window</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        No reservations yet. Bookings will appear here.
                      </td>
                    </tr>
                  ) : (
                    recent.map((reservation) => (
                      <tr key={reservation.id}>
                        <td className="mono">{reservation.reference}</td>
                        <td>
                          <div className="cell-stack">
                            <strong>{reservation.user?.name || 'Driver'}</strong>
                            <small>{reservation.user?.email}</small>
                          </div>
                        </td>
                        <td>{reservation.slot?.code}</td>
                        <td>
                          <div className="cell-stack">
                            <strong>{formatDate(reservation.startTime)}</strong>
                            <small>
                              {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
                            </small>
                          </div>
                        </td>
                        <td>{formatMoney(reservation.totalPrice)}</td>
                        <td>
                          <StatusPill status={reservation.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="side-stack">
            <div className="panel">
              <div className="panel-head">
                <h2>Lot health</h2>
              </div>
              <div className="occupancy">
                <div className="occupancy-head">
                  <span>Occupancy right now</span>
                  <strong>{stats?.occupancyRate ?? 0}%</strong>
                </div>
                <div className="meter">
                  <span style={{ width: `${Math.min(stats?.occupancyRate ?? 0, 100)}%` }} />
                </div>
                <p>
                  {stats?.occupiedNow ?? 0} of {stats?.activeSlots ?? 0} active bays currently
                  occupied.
                </p>
              </div>
              <ul className="mini-stats">
                <li>
                  <span>Active bays</span>
                  <strong>{stats?.activeSlots ?? 0}</strong>
                </li>
                <li>
                  <span>Cancelled bookings</span>
                  <strong>{stats?.cancelledReservations ?? 0}</strong>
                </li>
                <li>
                  <span>Bookings today</span>
                  <strong>{stats?.todaysReservations ?? 0}</strong>
                </li>
                <li>
                  <span>Total reservations</span>
                  <strong>{stats?.totalReservations ?? 0}</strong>
                </li>
              </ul>
            </div>

            <div className="panel quick-actions">
              <h2>Quick actions</h2>
              <button type="button" className="btn btn-primary btn-block" onClick={openCreate}>
                <Plus size={16} /> Add a parking bay
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => setTab('reservations')}
              >
                <Ticket size={16} /> Review reservations
              </button>
            </div>
          </aside>
        </div>
      ) : tab === 'slots' ? (
        <>
          <div className="toolbar">
            <div>
              <h2>Parking bays</h2>
              <p>
                {activeSlots} bookable of {slots.length} total bays.
              </p>
            </div>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add bay
            </button>
          </div>

          {slots.length === 0 ? (
            <EmptyState
              icon={<MapPin size={26} />}
              title="No bays configured"
              description="Add your first parking bay to start taking reservations."
              action={
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                  <Plus size={16} /> Add a bay
                </button>
              }
            />
          ) : (
            <div className="panel table-panel">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bay</th>
                      <th>Type</th>
                      <th>Zone</th>
                      <th>Rate</th>
                      <th>Features</th>
                      <th>Status</th>
                      <th className="align-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.id} className={slot.isActive ? '' : 'row-muted'}>
                        <td>
                          <div className="cell-inline">
                            <span className="bay-code">{slot.code}</span>
                            <span>{slot.level}</span>
                          </div>
                        </td>
                        <td>{typeLabel(slot.type)}</td>
                        <td>{zoneLabel(slot.zone)}</td>
                        <td>{formatMoney(slot.pricePerHour)}/hr</td>
                        <td className="cell-features">
                          {slot.features.length ? slot.features.slice(0, 2).join(' · ') : '—'}
                        </td>
                        <td>
                          <span
                            className={
                              slot.isActive
                                ? 'status-pill status-open'
                                : 'status-pill status-cancelled'
                            }
                          >
                            <span className="status-dot" />
                            {slot.isActive ? 'Bookable' : 'Archived'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => openEdit(slot)}
                              aria-label={`Edit bay ${slot.code}`}
                              title="Edit bay"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => setDeleteTarget(slot)}
                              aria-label={`Delete bay ${slot.code}`}
                              title="Delete bay"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="toolbar">
            <div>
              <h2>All reservations</h2>
              <p>{filteredReservations.length} shown of {reservations.length} loaded.</p>
            </div>
            <div className="search-input">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, plate or driver…"
                aria-label="Search reservations"
              />
            </div>
          </div>

          <StatusFilter value={resStatus} onChange={setResStatus} counts={resCounts} />

          <div className="panel table-panel">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Driver</th>
                    <th>Bay</th>
                    <th>Window</th>
                    <th>Vehicle</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th className="align-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-empty">
                        No reservations match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((reservation) => (
                      <tr key={reservation.id}>
                        <td className="mono">{reservation.reference}</td>
                        <td>
                          <div className="cell-stack">
                            <strong>{reservation.user?.name || 'Driver'}</strong>
                            <small>{reservation.user?.email}</small>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <strong>{reservation.slot?.code}</strong>
                            <small>{reservation.slot?.level}</small>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <strong>{formatDate(reservation.startTime)}</strong>
                            <small>
                              {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
                            </small>
                          </div>
                        </td>
                        <td className="mono">{reservation.vehiclePlate}</td>
                        <td>{formatMoney(reservation.totalPrice)}</td>
                        <td>
                          <StatusPill status={reservation.status} />
                        </td>
                        <td>
                          <div className="row-actions">
                            {reservation.status === 'active' && !isPast(reservation.startTime) ? (
                              <button
                                type="button"
                                className="icon-btn danger"
                                onClick={() => setCancelTarget(reservation)}
                                title="Cancel reservation"
                                aria-label={`Cancel reservation ${reservation.reference}`}
                              >
                                <Trash size={16} />
                              </button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SlotEditorModal
        open={editorOpen}
        slot={editingSlot}
        onClose={() => setEditorOpen(false)}
        onSaved={loadAdmin}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        title={`Delete bay ${deleteTarget?.code || ''}?`}
        subtitle="This removes the bay from the bookable inventory."
        width={470}
      >
        <p className="modal-copy">
          Bays with existing booking history are archived instead of deleted so past
          reservations stay intact. This cannot be undone from the console.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Keep bay
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Spinner size={16} /> : <Trash size={16} />}
            {deleting ? 'Deleting…' : 'Delete bay'}
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => (cancelling ? null : setCancelTarget(null))}
        title="Cancel this reservation?"
        subtitle="The bay will be released for other drivers."
        width={470}
      >
        {cancelTarget && (
          <>
            <div className="booking-slot-banner">
              <span className="bay-icon">
                <Ticket size={20} />
              </span>
              <div>
                <strong>
                  {cancelTarget.reference} · {cancelTarget.slot?.code}
                </strong>
                <span>
                  {cancelTarget.user?.name} · {formatDate(cancelTarget.startTime)} at{' '}
                  {formatTime(cancelTarget.startTime)}
                </span>
              </div>
            </div>
            <p className="modal-copy">
              Cancelling is only possible before the reservation starts. The driver’s
              booking history will show it as cancelled.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
              >
                Keep reservation
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleCancelReservation}
                disabled={cancelling}
              >
                {cancelling ? <Spinner size={16} /> : <Trash size={16} />}
                {cancelling ? 'Cancelling…' : 'Cancel reservation'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
