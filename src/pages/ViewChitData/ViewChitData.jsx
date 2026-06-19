import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { HiEye, HiTrash, HiXMark, HiMagnifyingGlass } from "react-icons/hi2";
import { db } from "../../firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import "./ViewChitData.css";

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
  } catch {
    return d;
  }
};

export default function ViewChitData() {
  const navigate = useNavigate();

  const [chits, setChits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [financialYear, setFinancialYear] = useState("all");
  const [selectedChitId, setSelectedChitId] = useState("");

  const fetchChits = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const snap = await getDocs(collection(db, "chits"));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.chitNo || 0) - (b.chitNo || 0));
      setChits(items);
    } catch (e) {
      console.error("Error fetching chits:", e);
      setLoadError("Couldn't load chits. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChits();
  }, []);

  const financialYearOptions = useMemo(() => {
    const set = new Set();
    chits.forEach((c) => { if (c.financialYear) set.add(c.financialYear); });
    return ["all", ...Array.from(set).sort()];
  }, [chits]);

  const filteredChits = useMemo(() => {
    let result = [...chits];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          (c.chitName || "").toLowerCase().includes(s) ||
          String(c.chitNo ?? "").includes(s)
      );
    }
    if (financialYear !== "all") {
      result = result.filter((c) => c.financialYear === financialYear);
    }
    return result;
  }, [chits, search, financialYear]);

  // Drop the selection if it falls outside the current filters
  useEffect(() => {
    if (selectedChitId && !filteredChits.some((c) => c.id === selectedChitId)) {
      setSelectedChitId("");
    }
  }, [filteredChits, selectedChitId]);

  const selectedChit = useMemo(
    () => chits.find((c) => c.id === selectedChitId) || null,
    [chits, selectedChitId]
  );

  const clearFilters = () => {
    setSearch("");
    setFinancialYear("all");
    setSelectedChitId("");
  };

  const handleSelectRow = (chitId) => {
    setSelectedChitId((prev) => (prev === chitId ? "" : chitId));
  };

  const handleDeleteChit = async (chit, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete chit "${chit.chitName}" (#${chit.chitNo})? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "chits", chit.id));
      if (selectedChitId === chit.id) setSelectedChitId("");
      await fetchChits();
    } catch (err) {
      console.error(err);
      alert("Failed to delete chit: " + err.message);
    }
  };

  const handleMemberClick = (chit, memberIndex) => {
    // Opens the member's installment-wise payment schedule page.
    navigate(`/chit-member/${chit.id}/${memberIndex}`);
  };

  return (
    <div className="chitview-container">
      <h1 className="chitview-heading">View Chit Data</h1>

      {loadError && <div className="chitview-banner chitview-banner--error">⚠️ {loadError}</div>}

      {/* Filters */}
      <div className="chitview-controls">
        <div className="chitview-controls-row">
          <div className="chitview-field chitview-field--grow">
            <label className="chitview-filter-label">Search</label>
            <div className="chitview-search-wrap">
              <HiMagnifyingGlass className="chitview-search-icon" />
              <input
                type="text"
                className="chitview-input chitview-search-input"
                placeholder="Search by chit name or chit no."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="chitview-field">
            <label className="chitview-filter-label">Financial Year</label>
            <select
              className="chitview-select"
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
            >
              {financialYearOptions.map((fy) => (
                <option key={fy} value={fy}>{fy === "all" ? "All Years" : fy}</option>
              ))}
            </select>
          </div>

          <div className="chitview-field chitview-field--grow">
            <label className="chitview-filter-label">Select a Chit</label>
            <select
              className="chitview-select"
              value={selectedChitId}
              onChange={(e) => setSelectedChitId(e.target.value)}
            >
              <option value="">— Choose a chit —</option>
              {filteredChits.map((c) => (
                <option key={c.id} value={c.id}>
                   {c.chitName || "Untitled"}
                </option>
              ))}
            </select>
          </div>

          {(search || financialYear !== "all" || selectedChitId) && (
            <button className="chitview-btn chitview-btn--clear" type="button" onClick={clearFilters}>
              <HiXMark /> Clear
            </button>
          )}
        </div>

        <div className="chitview-stats-row">
          <span className="chitview-stat">Chits found: <strong>{filteredChits.length}</strong></span>
        </div>
      </div>

      {/* All chits */}
      <div className="chitview-table-wrapper">
        <table className="chitview-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Chit No</th>
              <th>Chit Name</th>
              <th>Members</th>
              <th>Financial Year</th>
              <th>Installments</th>
              <th>Installment Amt</th>
              <th>Total Value</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="chitview-empty">Loading chits…</td></tr>
            ) : filteredChits.length === 0 ? (
              <tr><td colSpan={11} className="chitview-empty">No chits found. Try adjusting your filters.</td></tr>
            ) : (
              filteredChits.map((c, idx) => (
                <tr
                  key={c.id}
                  className={`chitview-row ${selectedChitId === c.id ? "chitview-row--selected" : ""}`}
                  onClick={() => handleSelectRow(c.id)}
                >
                  <td>{idx + 1}</td>
                  <td>{c.chitNo}</td>
                  <td>{c.chitName || "Untitled"}</td>
                  <td className="chitview-numeric">{c.noOfMembers ?? "—"}</td>
                  <td>{c.financialYear || "—"}</td>
                  <td className="chitview-numeric">{c.noOfInstallments ?? "—"}</td>
                  <td className="chitview-numeric">{formatINR(c.installmentAmount)}</td>
                  <td className="chitview-numeric">{formatINR(c.totalChitValue)}</td>
                  <td>{formatDate(c.startDate)}</td>
                  <td>{formatDate(c.endDate)}</td>
                  <td className="chitview-actions">
                    <button
                      className="chitview-icon-btn chitview-icon-btn--view"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedChitId(c.id); }}
                      title="View members"
                    >
                      <HiEye />
                    </button>
                    <button
                      className="chitview-icon-btn chitview-icon-btn--delete"
                      type="button"
                      onClick={(e) => handleDeleteChit(c, e)}
                      title="Delete chit"
                    >
                      <HiTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Selected chit detail */}
      {selectedChit && (
        <div className="chitview-detail">
          <div className="chitview-detail-header">
            <h3 className="chitview-detail-title">Chit Details</h3>
            <button className="chitview-btn chitview-btn--clear" type="button" onClick={() => setSelectedChitId("")}>
              <HiXMark /> Close
            </button>
          </div>

          <div className="chitview-table-wrapper">
            <table className="chitview-table">
              <thead>
                <tr>
                  <th>Name of the Chit</th>
                  <th>No. of Members</th>
                  <th>No. of Installments</th>
                  <th>Installment Amount</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Financial Year</th>
                  <th>Total Chit Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{selectedChit.chitName || "Untitled"}</td>
                  <td className="chitview-numeric">{selectedChit.noOfMembers ?? "—"}</td>
                  <td className="chitview-numeric">{selectedChit.noOfInstallments ?? "—"}</td>
                  <td className="chitview-numeric">{formatINR(selectedChit.installmentAmount)}</td>
                  <td>{formatDate(selectedChit.startDate)}</td>
                  <td>{formatDate(selectedChit.endDate)}</td>
                  <td>{selectedChit.financialYear || "—"}</td>
                  <td className="chitview-numeric">{formatINR(selectedChit.totalChitValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="chitview-detail-subtitle">Member Details</h4>
          <div className="chitview-table-wrapper">
            <table className="chitview-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Folio No</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Mobile No</th>
                  <th>Email ID</th>
                </tr>
              </thead>
              <tbody>
                {(selectedChit.members || []).length === 0 ? (
                  <tr><td colSpan={6} className="chitview-empty">No members added for this chit.</td></tr>
                ) : (
                  selectedChit.members.map((m, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{m.folioNo || "—"}</td>
                      <td>
                        <button
                          className="chitview-member-link"
                          type="button"
                          onClick={() => handleMemberClick(selectedChit, idx)}
                        >
                          {m.name || "Unnamed"}
                        </button>
                      </td>
                      <td>{m.address || "—"}</td>
                      <td>{m.mobileNo || "—"}</td>
                      <td>{m.mailId || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}