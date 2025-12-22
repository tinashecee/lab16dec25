import React, { useState } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { loanService } from "../../services/loanService";
import { useAuth } from "../../contexts/AuthContext";

export default function LoanRequestForm() {
  const { userData } = useAuth();
  const { id, name, department, role } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    purpose: "",
    repaymentMonths: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name || !department) {
      setError("User information is missing");
      return;
    }

    let approver1 = "";
    let approver2 = "";
    let approverEmail = "";
    let preapproval = "";

    if (role === "Finance Manager" || role === "Finance Executive") {
      approver1 = "";
      approver2 = "Finance Executive";
      approverEmail = "Finance Executive";
      preapproval = "true";
    } else {
      approver1 = "Finance Manager";
      approver2 = "Finance Executive";
      approverEmail = "Finance Manager";
      preapproval = "false";
    }

    try {
      setLoading(true);
      setError(null);
      await loanService.createLoanRequest({
        employeeId: id,
        employeeName: name,
        department,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        email: userData?.email,
        repaymentMonths: parseInt(formData.repaymentMonths, 10),
        approver1,
        approver2,
        approverEmail,
        preapproval,
      });
      setSuccess(true);
      setFormData({ amount: "", purpose: "", repaymentMonths: "" });
    } catch (err) {
      console.error("Error submitting loan request:", err);
      setError("Failed to submit loan request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-secondary-900">
          Request a Loan
        </h2>
        <p className="mt-1 text-sm text-secondary-500">
          Please fill out the form below to submit your loan request.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-secondary-700">
            Loan Amount ($)
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            min="100"
            step="100"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Enter amount"
          />
        </div>

        <div>
          <label
            htmlFor="purpose"
            className="block text-sm font-medium text-secondary-700">
            Purpose
          </label>
          <textarea
            id="purpose"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            required
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Explain the purpose of the loan"
          />
        </div>

        <div>
          <label
            htmlFor="repaymentMonths"
            className="block text-sm font-medium text-secondary-700">
            Repayment Period (months)
          </label>
          <input
            type="number"
            id="repaymentMonths"
            name="repaymentMonths"
            value={formData.repaymentMonths}
            onChange={handleChange}
            min="1"
            max="36"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Enter repayment period"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Loan request submitted successfully!
              </h3>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className={`
            inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm
            ${
              loading
                ? "bg-primary-400 cursor-not-allowed"
                : "bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            }
          `}>
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
