export default function CashClosingActions({ onCancel, onSave, isSaving, canSave }) {
  return (
    <>
      <button className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>
        Cancel
      </button>
      <button className="btn btn-primary" onClick={onSave} disabled={isSaving || !canSave}>
        {isSaving ? 'Saving...' : 'Save Cash Closing'}
      </button>
    </>
  );
}
