import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ChitCreation from "./pages/ChitCreation/ChitCreation";
import ViewChitData from "./pages/ViewChitData/ViewChitData";
import MemberPaymentSchedule from "./pages/MemberPaymentSchedule/MemberPaymentSchedule";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/chit-creation" replace />} />
        <Route path="chit-creation" element={<ChitCreation />} />
        <Route path="view-data" element={<ViewChitData />} />
        <Route path="chit-member/:chitId/:memberIndex" element={<MemberPaymentSchedule />} />
      </Route>
    </Routes>
  );
}