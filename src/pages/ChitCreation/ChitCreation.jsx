import { useState, useEffect, useRef } from "react";
import { HiPlus, HiTrash, HiChevronDown } from "react-icons/hi2";
import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, updateDoc, doc,
  query, orderBy,
} from "firebase/firestore";
import "./ChitCreationPage.css";

const blankMember = () => ({
  id: Date.now() + Math.random(),
  name: "", address: "", folioNo: "", mobileNo: "", mailId: "",
  _errors: {},
});

const parseNum = (v) => parseFloat((v ?? "").toString().replace(/,/g, "")) || 0;
const formatINR = (n) =>
  "₹ " + (isNaN(n) ? "0.00" : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function ChitCreationPage() {
  const [loading, setLoading] = useState(false);
  const [chitNo, setChitNo] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const [savedChits, setSavedChits] = useState([]);
  const [selectedChitId, setSelectedChitId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const comboRef = useRef(null);
  const isEditMode = Boolean(selectedChitId);

  const [financialYear, setFinancialYear] = useState("2026-27");
  const [chitName, setChitName] = useState("");
  const [noOfInstallments, setNoOfInstallments] = useState("");
  const [noOfMembers, setNoOfMembers] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [headerErrors, setHeaderErrors] = useState({});

  const [members, setMembers] = useState([blankMember()]);

  const instNum = parseInt(noOfInstallments) || 0;
  const membNum = parseInt(noOfMembers) || 0;
  const mismatch = instNum > 0 && membNum > 0 && instNum !== membNum;
  const totalChitValue = parseNum(installmentAmount) * instNum;
  const filledMembersCount = members.filter((m) => m.name.trim() !== "").length;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch all saved chits
  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, "chits"), orderBy("chitNo", "asc"));
        const snap = await getDocs(q);
        const chits = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSavedChits(chits);
        if (chits.length > 0) {
          setChitNo(chits[chits.length - 1].chitNo + 1);
        }
      } catch (e) {
        console.error("Error fetching chits:", e);
      }
    };
    fetchData();
  }, []);

  // Sync member rows when noOfMembers changes (create mode only)
  useEffect(() => {
    if (isEditMode) return;
    const n = parseInt(noOfMembers) || 0;
    if (n <= 0) return;
    setMembers((prev) => {
      if (prev.length === n) return prev;
      if (prev.length < n)
        return [...prev, ...Array.from({ length: n - prev.length }, blankMember)];
      return prev.slice(0, n);
    });
  }, [noOfMembers, isEditMode]);

  // User types in the box — create mode
  const handleChitNameType = (value) => {
    setChitName(value);
    setSelectedChitId("");
    setHeaderErrors((p) => ({ ...p, chitName: "" }));
    setSubmitted(false);
  };

  // User picks a saved chit from dropdown
  const handleChitSelect = (chit) => {
    setDropdownOpen(false);
    setSelectedChitId(chit.id);
    setHeaderErrors({});
    setGlobalError("");
    setSubmitted(false);

    setFinancialYear(chit.financialYear || "2026-27");
    setChitName(chit.chitName || "");
    setNoOfInstallments(String(chit.noOfInstallments || ""));
    setNoOfMembers(String(chit.noOfMembers || ""));
    setInstallmentAmount(String(chit.installmentAmount || ""));
    setStartDate(chit.startDate || "");

    const loadedMembers = (chit.members || []).map((m) => ({
      id: Date.now() + Math.random(),
      name: m.name || "",
      address: m.address || "",
      folioNo: m.folioNo || "",
      mobileNo: m.mobileNo || "",
      mailId: m.mailId || "",
      _errors: {},
    }));
    setMembers(loadedMembers.length > 0 ? loadedMembers : [blankMember()]);
  };

  const handleMemberChange = (id, field, value) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, [field]: value };
        if (updated._errors[field]) updated._errors = { ...updated._errors, [field]: "" };
        return updated;
      })
    );
  };

  const addMember = () => setMembers((prev) => [...prev, blankMember()]);

  const removeMember = (id) =>
    setMembers((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      return filtered.length === 0 ? [blankMember()] : filtered;
    });

  const validate = () => {
    let valid = true;
    const hErr = {};
    if (!chitName.trim()) { hErr.chitName = "Chit name is required."; valid = false; }
    if (instNum <= 0) { hErr.noOfInstallments = "Enter number of installments."; valid = false; }
    if (membNum <= 0) { hErr.noOfMembers = "Enter number of members."; valid = false; }
    if (parseNum(installmentAmount) <= 0) { hErr.installmentAmount = "Enter installment amount."; valid = false; }
    if (mismatch) {
      hErr.noOfMembers = `Members (${membNum}) must equal installments (${instNum}).`;
      hErr.noOfInstallments = `Installments (${instNum}) must equal members (${membNum}).`;
      valid = false;
    }
    setHeaderErrors(hErr);

    const updatedMembers = members.map((m) => {
      const errs = {};
      if (!m.name.trim()) { errs.name = "Name is required."; valid = false; }
      if (!m.address.trim()) { errs.address = "Address is required."; valid = false; }
      if (m.mobileNo && !/^\d{10}$/.test(m.mobileNo.trim())) {
        errs.mobileNo = "Enter valid 10-digit mobile number."; valid = false;
      }
      if (m.mailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.mailId.trim())) {
        errs.mailId = "Enter valid email address."; valid = false;
      }
      return { ...m, _errors: errs };
    });
    setMembers(updatedMembers);
    return valid;
  };

  const handleSubmit = async () => {
    setGlobalError("");
    setSubmitted(false);
    if (!validate()) { setGlobalError("Please fix the errors below before saving."); return; }

    setLoading(true);
    try {
      const payload = {
        financialYear,
        chitName: chitName.trim(),
        noOfInstallments: instNum,
        noOfMembers: membNum,
        installmentAmount: parseNum(installmentAmount),
        totalChitValue,
        startDate,
        members: members.map(({ id, _errors, ...rest }) => rest),
      };

      if (isEditMode) {
        await updateDoc(doc(db, "chits", selectedChitId), payload);
        setSavedChits((prev) =>
          prev.map((c) => (c.id === selectedChitId ? { ...c, ...payload } : c))
        );
      } else {
        const newDoc = await addDoc(collection(db, "chits"), {
          ...payload,
          chitNo,
          createdAt: new Date(),
        });
        setSavedChits((prev) => [...prev, { id: newDoc.id, ...payload, chitNo }]);
        setChitNo((prev) => prev + 1);
      }
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setGlobalError("Save failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedChitId("");
    setChitName(""); setNoOfInstallments(""); setNoOfMembers("");
    setInstallmentAmount(""); setStartDate("");
    setHeaderErrors({}); setGlobalError(""); setSubmitted(false);
    setMembers([blankMember()]);
  };

  return (
    <div className="chit-container">
      <h1 className="chit-heading">Chit Creation</h1>

      {globalError && <div className="banner banner--error">⚠️ {globalError}</div>}
      {submitted && (
        <div className="banner banner--success">
          ✅ Chit "<strong>{chitName}</strong>"{" "}
          {isEditMode ? "updated" : "saved"} successfully!{" "}
          {!isEditMode && (
            <span className="banner-link" onClick={resetForm}>Create another</span>
          )}
        </div>
      )}

      {/* Financial Year */}
      <div className="chit-top-inputs">
        <div className="top-input-wrapper">
          <label className="top-label">Financial Year</label>
          <select
            className="top-select"
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
          >
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
            <option value="2026-27">2026-27</option>
            <option value="2027-28">2027-28</option>
          </select>
        </div>
      </div>

      <div className="form-wrapper">
        <div className="entry-grid">

          {/* ── Combo box: type OR click arrow to pick ── */}
          <div className="entry-input" ref={comboRef} style={{ position: "relative" }}>
            <label className="entry-label">
              Name of the Chit <span className="required">*</span>
            </label>

            <div className={`chit-combo ${headerErrors.chitName ? "chit-combo--error" : ""}`}>
              <input
                className="chit-combo__input"
                type="text"
                placeholder="Type to create new chit…"
                value={chitName}
                onChange={(e) => handleChitNameType(e.target.value)}
                onFocus={() => setDropdownOpen(false)}
              />
              <span className="chit-combo__divider" />
              <button
                type="button"
                className="chit-combo__arrow"
                title="Select saved chit"
                onClick={() => setDropdownOpen((o) => !o)}
              >
                <HiChevronDown
                  style={{
                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
            </div>

            {isEditMode && (
              <span className="optional" style={{ marginTop: "4px", display: "block" }}>
                ✏️ Editing existing chit
              </span>
            )}

            {headerErrors.chitName && (
              <span className="error-msg">{headerErrors.chitName}</span>
            )}

            {dropdownOpen && (
              <ul className="chit-combo__dropdown">
                {savedChits.length === 0 ? (
                  <li className="chit-combo__dropdown-item chit-combo__dropdown-item--empty">
                    No saved chits found
                  </li>
                ) : (
                  savedChits.map((c) => (
                    <li
                      key={c.id}
                      className={`chit-combo__dropdown-item ${c.id === selectedChitId ? "chit-combo__dropdown-item--active" : ""}`}
                      onMouseDown={() => handleChitSelect(c)}
                    >
                      <span className="chit-combo__dropdown-no">#{c.chitNo}</span>
                      {c.chitName}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <div className="entry-input">
            <label className="entry-label">No. of Installments <span className="required">*</span></label>
            <input
              className={`field-input ${headerErrors.noOfInstallments ? "field-input--error" : ""}`}
              type="number" min="1"
              value={noOfInstallments}
              onChange={(e) => {
                const val = e.target.value;
                setNoOfInstallments(val);
                if (!isEditMode) setNoOfMembers(val);
                setHeaderErrors((p) => ({ ...p, noOfInstallments: "", noOfMembers: "" }));
              }}
            />
            {headerErrors.noOfInstallments && (
              <span className="error-msg">{headerErrors.noOfInstallments}</span>
            )}
          </div>

          <div className="entry-input">
            <label className="entry-label">No. of Members <span className="required">*</span></label>
            <input
              className={`field-input ${headerErrors.noOfMembers ? "field-input--error" : ""}`}
              type="number" min="1"
              value={noOfMembers}
              onChange={(e) => {
                setNoOfMembers(e.target.value);
                setHeaderErrors((p) => ({ ...p, noOfMembers: "", noOfInstallments: "" }));
              }}
            />
            {headerErrors.noOfMembers && (
              <span className="error-msg">{headerErrors.noOfMembers}</span>
            )}
            {mismatch && (
              <span className="error-msg">⚠️ Members ({membNum}) ≠ Installments ({instNum})</span>
            )}
          </div>

          <div className="entry-input">
            <label className="entry-label">Installment Amount (₹) <span className="required">*</span></label>
            <input
              className={`field-input ${headerErrors.installmentAmount ? "field-input--error" : ""}`}
              type="number" min="0" step="0.01"
              value={installmentAmount}
              onChange={(e) => {
                setInstallmentAmount(e.target.value);
                setHeaderErrors((p) => ({ ...p, installmentAmount: "" }));
              }}
            />
            {headerErrors.installmentAmount && (
              <span className="error-msg">{headerErrors.installmentAmount}</span>
            )}
          </div>

          <div className="entry-input">
            <label className="entry-label">Start Date</label>
            <input
              className="field-input" type="date"
              value={startDate} min="1000-01-01" max="9999-12-31"
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

        </div>

        <hr className="form-divider" />
        <h3 className="form-section-title">Member Details</h3>

        {members.map((member, index) => (
          <div key={member.id} className="member-card">
            {members.length > 1 && (
              <button className="remove-btn" type="button" onClick={() => removeMember(member.id)}>
                <HiTrash /> Remove
              </button>
            )}
            <h4 className="member-card-title">Member #{index + 1}</h4>
            <div className="member-grid">

              <div className="entry-input">
                <label className="entry-label">Name <span className="required">*</span></label>
                <input
                  className={`field-input ${member._errors.name ? "field-input--error" : ""}`}
                  type="text" value={member.name}
                  onChange={(e) => handleMemberChange(member.id, "name", e.target.value)}
                />
                {member._errors.name && <span className="error-msg">{member._errors.name}</span>}
              </div>

              <div className="entry-input entry-input--wide">
                <label className="entry-label">Address <span className="required">*</span></label>
                <input
                  className={`field-input ${member._errors.address ? "field-input--error" : ""}`}
                  type="text" value={member.address}
                  onChange={(e) => handleMemberChange(member.id, "address", e.target.value)}
                />
                {member._errors.address && <span className="error-msg">{member._errors.address}</span>}
              </div>

              <div className="entry-input">
                <label className="entry-label">Folio No <span className="optional">optional</span></label>
                <input
                  className="field-input" type="text" value={member.folioNo}
                  onChange={(e) => handleMemberChange(member.id, "folioNo", e.target.value)}
                />
              </div>

              <div className="entry-input">
                <label className="entry-label">Mobile No <span className="optional">optional</span></label>
                <input
                  className={`field-input ${member._errors.mobileNo ? "field-input--error" : ""}`}
                  type="tel" maxLength={10} value={member.mobileNo}
                  onChange={(e) =>
                    handleMemberChange(member.id, "mobileNo", e.target.value.replace(/\D/g, ""))
                  }
                />
                {member._errors.mobileNo && <span className="error-msg">{member._errors.mobileNo}</span>}
              </div>

              <div className="entry-input">
                <label className="entry-label">Email ID <span className="optional">optional</span></label>
                <input
                  className={`field-input ${member._errors.mailId ? "field-input--error" : ""}`}
                  type="email" value={member.mailId}
                  onChange={(e) => handleMemberChange(member.id, "mailId", e.target.value)}
                />
                {member._errors.mailId && <span className="error-msg">{member._errors.mailId}</span>}
              </div>

            </div>
          </div>
        ))}

        <button className="add-member-btn" type="button" onClick={addMember}>
          <HiPlus /> Add Another Member
        </button>

        <div className="summary-box">
          <div className="summary-content">
            <div>
              <h4 className="summary-title">Chit Summary</h4>
              <p className="summary-line">Financial Year: <strong>{financialYear}</strong></p>
              <p className="summary-line">
                Members filled:{" "}
                <strong>{filledMembersCount}{noOfMembers ? ` / ${noOfMembers}` : ""}</strong>
              </p>
              {mismatch && (
                <p className="summary-mismatch">⚠️ Members ≠ Installments — fix before saving.</p>
              )}
            </div>
            <div className="summary-right">
              <p className="summary-line">Installments: <strong>{noOfInstallments || "—"}</strong></p>
              <p className="summary-line">Per Installment: <strong>{formatINR(parseNum(installmentAmount))}</strong></p>
              <h2 className="summary-grand-total">{formatINR(totalChitValue)}</h2>
              <p className="summary-line">Total Chit Value</p>
            </div>
          </div>
        </div>

        <button
          className={`submit-btn ${(loading || mismatch) ? "submit-btn--disabled" : ""}`}
          type="button"
          disabled={loading || mismatch}
          onClick={handleSubmit}
        >
          {loading
            ? (isEditMode ? "Updating…" : "Saving…")
            : isEditMode
              ? `Update Chit — ${chitName || "Untitled"}`
              : `Save Chit — ${chitName || "Untitled"}`}
        </button>

      </div>
    </div>
  );
}