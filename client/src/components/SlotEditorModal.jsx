import { useEffect, useState } from 'react';
import { Modal } from './Modal.jsx';
import { Spinner } from './Spinner.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, errorMessage } from '../lib/api.js';

const EMPTY = {
  code: '',
  level: '',
  zone: 'standard',
  type: 'car',
  pricePerHour: '2.50',
  features: '',
  isActive: true,
};

export function SlotEditorModal({ open, slot, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(slot?.id);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSaving(false);
    setForm(
      slot
        ? {
            code: slot.code,
            level: slot.level,
            zone: slot.zone,
            type: slot.type,
            pricePerHour: String(slot.pricePerHour),
            features: (slot.features || []).join(', '),
            isActive: slot.isActive,
          }
        : EMPTY,
    );
  }, [open, slot]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        level: form.level.trim(),
        zone: form.zone,
        type: form.type,
        pricePerHour: Number(form.pricePerHour),
        features: form.features
          .split(',')
          .map((feature) => feature.trim())
          .filter(Boolean),
        isActive: form.isActive,
      };
      const data = await api(isEdit ? `/slots/${slot.id}` : '/slots', {
        method: isEdit ? 'PATCH' : 'POST',
        body,
      });
      toast(isEdit ? `Bay ${data.slot.code} updated.` : `Bay ${data.slot.code} added.`);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit bay ${slot?.code}` : 'Add a parking bay'}
      subtitle={isEdit ? 'Changes apply to future availability immediately.' : 'New bays become bookable as soon as you save.'}
      width={600}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Bay code</span>
            <input
              value={form.code}
              onChange={(event) => update('code', event.target.value.toUpperCase())}
              placeholder="D-01"
              maxLength={12}
              required
            />
          </label>
          <label className="field">
            <span>Level / area</span>
            <input
              value={form.level}
              onChange={(event) => update('level', event.target.value)}
              placeholder="Level D"
              maxLength={30}
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Bay type</span>
            <select value={form.type} onChange={(event) => update('type', event.target.value)}>
              <option value="car">Car</option>
              <option value="bike">Motorbike</option>
              <option value="ev">Electric vehicle</option>
            </select>
          </label>
          <label className="field">
            <span>Zone</span>
            <select value={form.zone} onChange={(event) => update('zone', event.target.value)}>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="ev">EV charging</option>
              <option value="accessible">Accessible</option>
              <option value="motorbike">Motorbike</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Price per hour (USD)</span>
            <input
              type="number"
              min="0"
              max="500"
              step="0.25"
              value={form.pricePerHour}
              onChange={(event) => update('pricePerHour', event.target.value)}
              required
            />
          </label>
          <div className="field field-check">
            <span>Availability</span>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => update('isActive', event.target.checked)}
              />
              <span>Bookable by drivers</span>
            </label>
          </div>
        </div>

        <label className="field">
          <span>Features (comma separated)</span>
          <input
            value={form.features}
            onChange={(event) => update('features', event.target.value)}
            placeholder="Covered, CCTV, Near lift"
          />
          <small>Up to 8 short badges shown on the bay card.</small>
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : null}
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add bay'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
