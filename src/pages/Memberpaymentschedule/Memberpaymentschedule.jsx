import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi2";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import "../ViewChitData/ViewChitData.css";
import "./MemberPaymentSchedule.css";


const ANNUAL_INTEREST_RATE = 0.24;
const DAILY_RATE           = ANNUAL_INTEREST_RATE / 365;
const DAY_MS                = 24 * 60 * 60 * 1000;

const INPUT_STYLE = {
  backgroundColor: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "13px",
  fontFamily: "inherit",
  padding: "5px 8px",
  outline: "none",
  colorScheme: "light",
};

const formatINR = (n) => {
  const num = Number(n) || 0;
  return "₹ " + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
};

const dueDateFor = (startDate, index) => {
  const d = new Date(startDate);
  d.setDate(d.getDate() + index * 30);
  return d;
};

const daysBetween = (paidDate, dueDate) => {
  const a = new Date(paidDate);
  const b = new Date(dueDate);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / DAY_MS);
};

// interest = (amountPayable - amountPaid) * 24% / 365 * delayDays
// No interest accrues unless the payment was actually late.
const calcInterest = (amountPayable, amountPaid, lateDays) => {
  const shortfall = Math.max(0, amountPayable - amountPaid);
  const total      = lateDays > 0 ? shortfall * DAILY_RATE * lateDays : 0;
  return { total };
};

export default function MemberPaymentSchedule() {
  const { chitId, memberIndex } = useParams();
  const navigate = useNavigate();
  const idx = Number(memberIndex);

  const [chit, setChit]                 = useState(null);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState("");
  const [savingRow, setSavingRow]       = useState(null);

  const member = chit?.members?.[idx] || null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const snap = await getDoc(doc(db, "chits", chitId));
        if (!snap.exists()) { setLoadError("Chit not found."); setLoading(false); return; }
        const data = { id: snap.id, ...snap.data() };
        const m = (data.members || [])[idx];
        if (!m) { setLoadError("Member not found on this chit."); setLoading(false); return; }
        const total    = Number(data.noOfInstallments) || 0;
        const existing = m.installments || [];
        const filled   = Array.from({ length: total }, (_, i) => ({
          dividend:       existing[i]?.dividend       ?? 0,
          amountPaid:     existing[i]?.amountPaid     ?? 0,
          amountPaidDate: existing[i]?.amountPaidDate ?? "",
        }));
        setChit(data);
        setInstallments(filled);
      } catch (e) {
        console.error("Error loading payment schedule:", e);
        setLoadError("Couldn't load the payment schedule. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [chitId, idx]);

  const dueDates = useMemo(() => {
    if (!chit?.startDate) return [];
    return installments.map((_, i) => dueDateFor(chit.startDate, i));
  }, [chit, installments.length]);

  const persistInstallments = useCallback(async (nextInstallments) => {
    if (!chit) return;
    try {
      const updatedMembers = chit.members.map((m, i) =>
        i === idx ? { ...m, installments: nextInstallments } : m
      );
      await updateDoc(doc(db, "chits", chitId), { members: updatedMembers });
      setChit((prev) => ({ ...prev, members: updatedMembers }));
    } catch (e) {
      console.error("Failed to save installment:", e);
      alert("Couldn't save your change. Please try again.");
    }
  }, [chit, chitId, idx]);

  const handleFieldChange = (rowIdx, field, value) => {
    setInstallments((prev) =>
      prev.map((row, i) => (i === rowIdx ? { ...row, [field]: value } : row))
    );
  };

  const handleFieldBlur = async (rowIdx) => {
    setSavingRow(rowIdx);
    await persistInstallments(installments);
    setSavingRow(null);
  };

  if (loading) return <div className="chitview-container"><p>Loading payment schedule…</p></div>;

  if (loadError) return (
    <div className="chitview-container">
      <div className="chitview-banner chitview-banner--error">⚠️ {loadError}</div>
      <button className="mps-back-btn" type="button" onClick={() => navigate(-1)}>
        <HiArrowLeft /> Back
      </button>
    </div>
  );

  const installmentAmt = Number(chit.installmentAmount) || 0;

  return (
    <div className="chitview-container">
      <button className="mps-back-btn" type="button" onClick={() => navigate(-1)}>
        <HiArrowLeft /> Back to chit
      </button>

      <h1 className="chitview-heading">{member.name || "Unnamed Member"} — Payment Schedule</h1>
      <p className="mps-subheading">
        Chit #{chit.chitNo} · {chit.chitName || "Untitled"} · Folio {member.folioNo || "—"}
      </p>

      {installments.length === 0 ? (
        <div className="chitview-banner">This chit has no installments configured yet.</div>
      ) : (
        <div className="chitview-table-wrapper">
          <table className="chitview-table">
            <thead>
              <tr>
                <th>Installment</th>
                <th>Due Date</th>
                <th>Installment Amt</th>
                <th>Dividend</th>
                <th>Amount Payable</th>
                <th>Amount Paid</th>
                <th>Amount Paid Date</th>
                <th>Paid vs Due</th>
                <th>Interest</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((row, i) => {
                const dueDate       = dueDates[i];
                const dividend      = Number(row.dividend) || 0;
                const amountPayable = installmentAmt - dividend;
                const amountPaid    = Number(row.amountPaid) || 0;

                const diff     = row.amountPaidDate ? daysBetween(row.amountPaidDate, dueDate) : null;
                const lateDays = diff !== null && diff > 0 ? diff : 0;

                const interest = calcInterest(amountPayable, amountPaid, lateDays);

                let diffLabel = "—";
                let diffClass = "";
                if (diff !== null) {
                  if (diff === 0)    { diffLabel = "On time";                                                        diffClass = "mps-ontime"; }
                  else if (diff > 0) { diffLabel = `${diff} day${diff === 1 ? "" : "s"} late`;                      diffClass = "mps-late";   }
                  else               { diffLabel = `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} early`; diffClass = "mps-early";  }
                }

                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{formatDate(dueDate)}</td>
                    <td className="chitview-numeric">{formatINR(installmentAmt)}</td>

                    {/* Dividend */}
                    <td className="chitview-numeric">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mps-pay-field"
                        style={{ ...INPUT_STYLE, width: "100px", textAlign: "right" }}
                        value={row.dividend}
                        onChange={(e) => handleFieldChange(i, "dividend", e.target.value)}
                        onBlur={() => handleFieldBlur(i)}
                      />
                    </td>

                    <td className="chitview-numeric">{formatINR(amountPayable)}</td>

                    {/* Amount Paid */}
                    <td className="chitview-numeric">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mps-pay-field"
                        style={{ ...INPUT_STYLE, width: "100px", textAlign: "right" }}
                        value={row.amountPaid}
                        onChange={(e) => handleFieldChange(i, "amountPaid", e.target.value)}
                        onBlur={() => handleFieldBlur(i)}
                      />
                    </td>

                    {/* Amount Paid Date */}
                    <td>
                      <input
                        type="date"
                        className="mps-pay-field mps-pay-field--date"
                        style={{ ...INPUT_STYLE, width: "136px", textAlign: "left" }}
                        value={row.amountPaidDate || ""}
                        onChange={(e) => handleFieldChange(i, "amountPaidDate", e.target.value)}
                        onBlur={() => handleFieldBlur(i)}
                      />
                    </td>

                    <td>
                      <span className={diffClass || ""}>{diffLabel}</span>
                    </td>

                    <td className={`chitview-numeric ${interest.total > 0 ? "mps-interest-pos" : "mps-interest-zero"}`}>
                      {formatINR(interest.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {savingRow !== null && <p className="mps-saving-note">Saving…</p>}
    </div>
  );
}