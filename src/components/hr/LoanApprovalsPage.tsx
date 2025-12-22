import React from "react";
import LoanStatistics from "./LoanStatistics";
import LoanApprovalsTable from "./LoanApprovalsTable";

const LoanApprovalsPage = () => {
  return (
    <div>
      <LoanStatistics />
      <LoanApprovalsTable />
    </div>
  );
};

export default LoanApprovalsPage;
