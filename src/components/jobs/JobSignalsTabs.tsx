import { NavLink } from 'react-router-dom';

/** Switch between the Job Signals search and the Contacted list. */
export function JobSignalsTabs({ contactedCount }: { contactedCount?: number }) {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${isActive ? 'bg-white text-[#14161A] shadow-xs' : 'text-[#374151] hover:text-[#14161A]'}`;
  return (
    <nav aria-label="Job signals sections" className="flex items-center bg-[#F4F5F8] p-1 rounded-full border border-[#D1D5DB] self-start md:self-auto">
      <NavLink to="/job-signals" end className={tab}>Signals</NavLink>
      <NavLink to="/job-signals/contacted" className={tab}>
        Contacted{contactedCount != null && ` (${contactedCount})`}
      </NavLink>
    </nav>
  );
}
